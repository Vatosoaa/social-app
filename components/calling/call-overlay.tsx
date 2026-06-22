'use client';

import { useEffect, useRef, useState } from 'react';
import { 
  Phone, PhoneOff, Video, VideoOff, Mic, MicOff, User, 
  Volume2, VolumeX, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DbUser } from '@/lib/session';
import { ToneGenerator } from './tone-generator';

interface CallOverlayProps {
  currentUser: DbUser;
  otherUser: { id: number; name: string; avatar: string | null };
  callType: 'video' | 'voice';
  direction: 'incoming' | 'outgoing';
  socket: WebSocket | null;
  onClose: () => void;
  initialSignal?: any;
  onCallFinished?: (
    type: 'video' | 'voice',
    status: 'missed' | 'accepted' | 'busy' | 'no-answer',
    durationSeconds: number
  ) => void;
}

type CallStatus = 
  | 'idle'
  | 'dialing' // Outgoing call ringing other user
  | 'ringing' // Incoming call ringing locally
  | 'connecting' // WebRTC handshaking
  | 'connected' // Call active
  | 'declined' // Callee rejected call
  | 'busy' // Callee is busy
  | 'ended' // Call finished
  | 'error'; // Permission or connection error

export default function CallOverlay({
  currentUser,
  otherUser,
  callType,
  direction,
  socket,
  onClose,
  initialSignal,
  onCallFinished
}: CallOverlayProps) {
  const [status, setStatus] = useState<CallStatus>('idle');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(callType === 'voice');
  const [errorMsg, setErrorMsg] = useState('');

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const toneGeneratorRef = useRef<ToneGenerator | null>(null);
  const iceCandidatesQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const connectedTimeRef = useRef<number | null>(null);

  const processQueuedCandidates = async (pc: RTCPeerConnection) => {
    while (iceCandidatesQueueRef.current.length > 0) {
      const cand = iceCandidatesQueueRef.current.shift();
      if (cand) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
        } catch (e) {
          console.error('Error adding queued ICE candidate:', e);
        }
      }
    }
  };

  // Track call start time
  useEffect(() => {
    if (status === 'connected') {
      connectedTimeRef.current = Date.now();
    }
  }, [status]);

  const reportCallFinished = (callStatus: 'missed' | 'accepted' | 'busy' | 'no-answer') => {
    if (direction !== 'outgoing' || !onCallFinished) return;
    
    let duration = 0;
    if (callStatus === 'accepted' && connectedTimeRef.current) {
      duration = Math.floor((Date.now() - connectedTimeRef.current) / 1000);
    }
    onCallFinished(callType, callStatus, duration);
  };

  // Initialize tone generator
  useEffect(() => {
    toneGeneratorRef.current = new ToneGenerator();
    return () => {
      toneGeneratorRef.current?.stop();
    };
  }, []);

  // Set up local video element stream mapping
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, status]);

  // Set up remote video element stream mapping
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, status]);

  // Main Call Lifecycle Management
  useEffect(() => {
    if (direction === 'outgoing') {
      startOutgoingCall();
    } else {
      startIncomingCall();
    }

    return () => {
      cleanupCall();
    };
  }, []);

  // Ringing timeout for outgoing calls (30s)
  useEffect(() => {
    if (status === 'dialing') {
      const timer = setTimeout(() => {
        handleHangup();
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  // Handle incoming signaling messages relayed from window custom event
  useEffect(() => {
    const handleSignal = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const { senderId, signal } = customEvent.detail;

      if (Number(senderId) !== Number(otherUser.id)) return;

      try {
        console.log('CallOverlay: handling signal', signal.type);
        switch (signal.type) {
          case 'sdp-offer':
            console.log('CallOverlay: processing SDP offer');
            await handleOffer(signal.sdp);
            break;
          case 'sdp-answer':
            console.log('CallOverlay: processing SDP answer');
            await handleAnswer(signal.sdp);
            break;
          case 'ice-candidate': {
            console.log('CallOverlay: processing ICE candidate');
            const pc = peerConnectionRef.current;
            if (pc && pc.remoteDescription) {
              await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
            } else {
              iceCandidatesQueueRef.current.push(signal.candidate);
            }
            break;
          }
          case 'declined':
            console.log('CallOverlay: call declined by remote');
            setStatus('declined');
            reportCallFinished('missed');
            toneGeneratorRef.current?.stop();
            setTimeout(onClose, 2000);
            break;
          case 'busy':
            console.log('CallOverlay: remote user is busy');
            setStatus('busy');
            reportCallFinished('busy');
            toneGeneratorRef.current?.stop();
            setTimeout(onClose, 2000);
            break;
          case 'hangup': {
            console.log('CallOverlay: call hung up by remote');
            const isCallConnected = connectedTimeRef.current !== null;
            setStatus('ended');
            reportCallFinished(isCallConnected ? 'accepted' : 'no-answer');
            toneGeneratorRef.current?.stop();
            setTimeout(onClose, 1500);
            break;
          }
        }
      } catch (err) {
        console.error('Error handling RTC signal:', err);
      }
    };

    window.addEventListener('call_signal', handleSignal);
    return () => {
      window.removeEventListener('call_signal', handleSignal);
    };
  }, [otherUser.id, localStream]);

  // Outgoing Call flow
  const startOutgoingCall = async () => {
    setStatus('dialing');
    toneGeneratorRef.current?.startDialing();

    try {
      // 1. Get local stream first to confirm media permissions
      const stream = await navigator.mediaDevices.getUserMedia({
        video: callType === 'video',
        audio: true
      });
      setLocalStream(stream);

      // 2. Notify other user of incoming call invitation
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'call_signal',
          payload: {
            targetId: otherUser.id,
            signal: {
              type: 'call-offer-init',
              callType,
              callerName: currentUser.name,
              callerAvatar: currentUser.avatar_url
            }
          }
        }));
      }
    } catch (err) {
      console.error('Media access error:', err);
      setErrorMsg("Impossible d'accéder au micro ou à la caméra.");
      setStatus('error');
      setTimeout(onClose, 3000);
    }
  };

  // Incoming Call flow
  const startIncomingCall = () => {
    setStatus('ringing');
    toneGeneratorRef.current?.startRinging();
  };

  // Accept incoming call
  const acceptCall = async () => {
    setStatus('connecting');
    toneGeneratorRef.current?.stop();

    try {
      // 1. Acquire local media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: callType === 'video',
        audio: true
      });
      setLocalStream(stream);

      // 2. Initialize RTCPeerConnection
      const pc = createPeerConnection(stream);
      peerConnectionRef.current = pc;

      // 3. Set remote description from caller's initial offer if available
      // (For WebRTC standard: Callee accepts call, obtains stream, then creates offer to Caller)
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send SDP offer to caller
      sendSignal({
        type: 'sdp-offer',
        sdp: offer
      });
    } catch (err) {
      console.error('Media access error on accept:', err);
      setErrorMsg("Impossible d'accéder au micro ou à la caméra.");
      setStatus('error');
      sendSignal({ type: 'declined' });
      setTimeout(onClose, 3000);
    }
  };

  // Handle incoming SDP offer (Caller receives this from Callee)
  const handleOffer = async (sdp: RTCSessionDescriptionInit) => {
    if (!localStream) return;
    
    // Ignore duplicate or out of order offer signals
    const activePc = peerConnectionRef.current;
    if (activePc && activePc.signalingState !== 'stable') {
      console.warn('Ignore SDP offer since signalingState is:', activePc.signalingState);
      return;
    }

    setStatus('connecting');
    toneGeneratorRef.current?.stop();

    try {
      const pc = createPeerConnection(localStream);
      peerConnectionRef.current = pc;

      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      await processQueuedCandidates(pc);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      sendSignal({
        type: 'sdp-answer',
        sdp: answer
      });
    } catch (err) {
      console.error('Error handling offer:', err);
      setStatus('error');
      setTimeout(onClose, 3000);
    }
  };

  // Handle incoming SDP answer (Callee receives this from Caller)
  const handleAnswer = async (sdp: RTCSessionDescriptionInit) => {
    try {
      const pc = peerConnectionRef.current;
      if (pc && pc.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        await processQueuedCandidates(pc);
      } else {
        console.warn('Ignore SDP answer since signalingState is:', pc?.signalingState);
      }
    } catch (err) {
      console.error('Error handling answer:', err);
    }
  };

  // Initialize standard RTCPeerConnection setup
  const createPeerConnection = (stream: MediaStream): RTCPeerConnection => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    // Add local tracks to peer connection
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    // Relay local ICE candidates to remote peer
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({
          type: 'ice-candidate',
          candidate: event.candidate
        });
      }
    };

    // Attach remote stream to UI when received
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
        setStatus('connected');
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        handleHangup();
      }
    };

    return pc;
  };

  // Send signaling messages
  const sendSignal = (signalPayload: any) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'call_signal',
        payload: {
          targetId: otherUser.id,
          signal: signalPayload
        }
      }));
    }
  };

  // Decline incoming call
  const declineCall = () => {
    sendSignal({ type: 'declined' });
    setStatus('declined');
    toneGeneratorRef.current?.stop();
    setTimeout(onClose, 1000);
  };

  // Hangup call
  const handleHangup = () => {
    sendSignal({ type: 'hangup' });
    setStatus('ended');
    const isCallConnected = connectedTimeRef.current !== null;
    reportCallFinished(isCallConnected ? 'accepted' : 'no-answer');
    toneGeneratorRef.current?.stop();
    setTimeout(onClose, 1000);
  };

  // Toggles
  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleCamera = () => {
    if (localStream && callType === 'video') {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOff(!videoTrack.enabled);
      }
    }
  };

  // Clean up resources on close/unmount
  const cleanupCall = () => {
    toneGeneratorRef.current?.stop();

    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
  };

  // Render Calling States Helper
  const getStatusText = () => {
    switch (status) {
      case 'dialing': return 'Appel en cours...';
      case 'ringing': return 'Appel entrant...';
      case 'connecting': return 'Connexion...';
      case 'connected': return 'En ligne';
      case 'declined': return 'Appel décliné';
      case 'busy': return 'Correspondant occupé';
      case 'ended': return 'Appel terminé';
      case 'error': return errorMsg || 'Erreur d\'appel';
      default: return '';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-md aspect-[3/4] sm:rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col items-center justify-between p-6 text-white">
        
        {/* Top Info Area */}
        <div className="w-full flex flex-col items-center mt-8 space-y-4 z-10">
          <div className="relative">
            {/* Avatar Pulse Rings */}
            {(status === 'dialing' || status === 'ringing' || status === 'connecting') && (
              <>
                <div className="absolute inset-0 rounded-full bg-violet-500/20 animate-ping duration-1000" />
                <div className="absolute inset-0 rounded-full bg-violet-500/10 animate-pulse duration-700 delay-300" />
              </>
            )}
            <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-violet-500 bg-slate-800 relative z-10 shadow-lg shadow-violet-500/10">
              {otherUser.avatar ? (
                <img src={otherUser.avatar} alt={otherUser.name} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-slate-800 text-slate-400">
                  <User className="h-10 w-10" />
                </div>
              )}
            </div>
          </div>

          <div className="text-center">
            <h3 className="text-lg font-bold tracking-wide">{otherUser.name}</h3>
            <p className="text-xs text-slate-400 font-medium mt-1 flex items-center justify-center gap-2">
              {status === 'connecting' && <Loader2 className="h-3 w-3 animate-spin text-violet-400" />}
              {getStatusText()}
            </p>
          </div>
        </div>

        {/* Video Canvas Container (Visible when Call is connected/connecting and is video type) */}
        {callType === 'video' && (status === 'connected' || status === 'connecting') && (
          <div className="absolute inset-0 bg-black z-0">
            {/* Remote Video Stream (Main screen) */}
            {remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
                <p className="text-xs">Attente du flux vidéo...</p>
              </div>
            )}

            {/* Local Video Stream (PIP Floating window) */}
            <div className="absolute top-4 right-4 w-28 aspect-[3/4] rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden shadow-lg z-20 transition-all duration-300">
              {isCameraOff ? (
                <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-500">
                  <VideoOff className="h-5 w-5" />
                </div>
              ) : (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              )}
            </div>
          </div>
        )}

        {/* Voice Call Active Waveform (Visible in voice mode when connected) */}
        {callType === 'voice' && status === 'connected' && (
          <div className="flex-1 w-full flex items-center justify-center z-10">
            <div className="flex items-center justify-center gap-1.5 h-16">
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="w-1.5 bg-gradient-to-t from-violet-500 to-fuchsia-500 rounded-full animate-bounce duration-550"
                  style={{
                    height: `${20 + Math.sin(i) * 30}px`,
                    animationDelay: `${i * 80}ms`
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Bottom Control / Actions Area */}
        <div className="w-full flex justify-center pb-8 z-10">
          {/* Ringing (Callee UI with Accept / Decline) */}
          {status === 'ringing' ? (
            <div className="flex items-center gap-8 animate-in slide-in-from-bottom-8 duration-300">
              <Button
                onClick={declineCall}
                variant="destructive"
                size="icon"
                className="h-14 w-14 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all"
              >
                <PhoneOff className="h-6 w-6" />
              </Button>
              <Button
                onClick={acceptCall}
                className="h-14 w-14 rounded-full bg-emerald-500 hover:bg-emerald-600 shadow-lg hover:scale-105 active:scale-95 transition-all"
                size="icon"
              >
                {callType === 'video' ? (
                  <Video className="h-6 w-6 text-white" />
                ) : (
                  <Phone className="h-6 w-6 text-white" />
                )}
              </Button>
            </div>
          ) : (
            /* Active call/dialing controls */
            <div className="flex items-center gap-4 bg-slate-950/40 backdrop-blur-md px-6 py-3 rounded-full border border-slate-800/80 animate-in slide-in-from-bottom-4 duration-300">
              {/* Mic Toggle */}
              <Button
                onClick={toggleMute}
                variant="ghost"
                size="icon"
                className={`h-11 w-11 rounded-full border ${
                  isMuted 
                    ? 'bg-rose-500/20 border-rose-500 text-rose-500 hover:bg-rose-500/30' 
                    : 'border-slate-700/60 hover:bg-slate-800 text-slate-300 hover:text-white'
                }`}
                disabled={status === 'error' || status === 'ended'}
              >
                {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </Button>

              {/* End Call Button */}
              <Button
                onClick={handleHangup}
                variant="destructive"
                size="icon"
                className="h-12 w-12 rounded-full shadow-lg shadow-rose-500/10 hover:scale-105 active:scale-95 transition-all"
                disabled={status === 'ended'}
              >
                <PhoneOff className="h-5 w-5" />
              </Button>

              {/* Camera Toggle (Video Call only) */}
              {callType === 'video' && (
                <Button
                  onClick={toggleCamera}
                  variant="ghost"
                  size="icon"
                  className={`h-11 w-11 rounded-full border ${
                    isCameraOff 
                      ? 'bg-rose-500/20 border-rose-500 text-rose-500 hover:bg-rose-500/30' 
                      : 'border-slate-700/60 hover:bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                  disabled={status === 'error' || status === 'ended'}
                >
                  {isCameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                </Button>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
