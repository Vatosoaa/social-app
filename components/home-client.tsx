"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useTransition,
  useOptimistic,
  useCallback,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Sparkles,
  Search,
  Bookmark,
  User,
  MessageSquare,
  Settings,
  Home as HomeIcon,
  Users,
  Clock,
  Flag,
  Bell,
  Play,
  Send,
  Smile,
  Image as ImageIcon,
  Video,
  Loader2,
  LogOut,
  ArrowRight,
  UserPlus,
  X,
  ChevronLeft,
  ChevronRight,
  Gift,
  Cake,
  UserMinus,
  UserCheck,
  Star,
  MoreVertical,
  ChevronDown,
} from "lucide-react";
import type { Post, UserStoryGroup } from "@/lib/definitions";
import StoryViewer from "@/components/story-viewer";
import AddStoryDialog from "@/components/add-story-dialog";
import { Plus } from "lucide-react";
import type { DbUser } from "@/lib/session";
import type { FollowUser } from "@/app/actions/follows";
import {
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
  unfriend,
} from "@/app/actions/friends";
import PostCard from "@/components/post-card";
import { createPost } from "@/app/actions/posts";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/actions/auth";
import { toggleFollow } from "@/app/actions/follows";
import { useAlert } from "@/components/providers/alert-provider";
import { deleteStory } from "@/app/actions/stories";
import AppShell from "@/components/app-shell";
import { toggleFavorite, clearAllFavorites } from "@/app/actions/interactions";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

// Brand icons
const FigmaIcon = () => (
  <svg
    className="h-3.5 w-3.5"
    viewBox="0 0 38 57"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M19 0C29.4934 0 38 8.50659 38 19C38 24.3168 35.7925 29.1173 32.2227 32.5539C28.8471 35.8078 24.1611 38 19 38C8.50659 38 0 29.4934 0 19C0 8.50659 8.50659 0 19 0Z"
      fill="#F24E1E"
    />
    <path
      d="M19 19C19 29.4934 27.5066 38 38 38C38 43.3168 35.7925 48.1173 32.2227 51.5539C28.8471 54.8078 24.1611 57 19 57C8.50659 57 0 48.4934 0 38C0 32.6832 2.2075 27.8827 5.77734 24.4461C9.15286 21.1922 13.8389 19 19 19Z"
      fill="#A259FF"
    />
    <path
      d="M0 19C0 8.50659 8.50659 0 19 0V38C8.50659 38 0 29.4934 0 19Z"
      fill="#F24E1E"
    />
    <path
      d="M19 38C19 27.5066 10.4934 19 0 19V38C0 48.4934 8.50659 57 19 57V38Z"
      fill="#1ABCFE"
    />
    <path
      d="M38 19C38 8.50659 29.4934 0 19 0V38C29.4934 38 38 29.4934 38 19Z"
      fill="#FF7262"
    />
    <path
      d="M38 38C38 27.5066 29.4934 19 19 19V38C29.4934 38 38 47.4934 38 38Z"
      fill="#0ACF83"
    />
  </svg>
);

const SketchIcon = () => (
  <svg
    className="h-3.5 w-3.5 text-amber-500"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M12 2L2 9.5L12 22L22 9.5L12 2Z" />
  </svg>
);

interface HomeClientProps {
  currentUser: DbUser | null;
  initialPosts: Post[];
  initialSuggestions: any[];
  initialFriendRequests: any[];
  initialFriendsList: any[];
  initialBirthdaysToday: any[];
  unreadMessagesCount: number;
  filter: string;
  error: string | null;
  stories: UserStoryGroup[];
}

const ACTIVE_STORIES = [
  { id: 1, name: "Quinn", seed: "Quinn" },
  { id: 2, name: "Alex", seed: "Alex" },
  { id: 3, name: "Sarah", seed: "Sarah" },
  { id: 4, name: "Sebastian", seed: "Sebastian" },
  { id: 5, name: "Stevy", seed: "Stevy" },
  { id: 6, name: "Jose", seed: "Jose" },
  { id: 7, name: "Alita", seed: "Alita" },
  { id: 8, name: "Andrew", seed: "Andrew" },
];

const PRESET_IMAGES = [
  {
    label: "Nature",
    url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1000&auto=format&fit=crop",
  },
  {
    label: "Ville",
    url: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=1000&auto=format&fit=crop",
  },
  {
    label: "Code",
    url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1000&auto=format&fit=crop",
  },
];

const PRESET_VIDEOS = [
  {
    label: "Gaming",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  },
  {
    label: "Nature",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  },
];

export default function HomeClient({
  currentUser,
  initialPosts,
  initialSuggestions,
  initialFriendRequests,
  initialFriendsList,
  initialBirthdaysToday,
  unreadMessagesCount,
  filter,
  error,
  stories,
}: HomeClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showAlert } = useAlert();
  const tabParam = searchParams.get("tab");
  const activeTab =
    filter === "favorites"
      ? "favorites"
      : tabParam === "network"
        ? "network"
        : "home";
  const [isPending, startTransition] = useTransition();

  // Derived filter flag
  const isFavoritesFilter = filter === "favorites";

  // ─── Stories state ───
  const [localStories, setLocalStories] = useState<UserStoryGroup[]>(stories);
  const [activeStoryGroup, setActiveStoryGroup] =
    useState<UserStoryGroup | null>(null);
  const [isAddStoryOpen, setIsAddStoryOpen] = useState(false);

  // Scroll controls for stories cards
  const storiesScrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const updateScrollArrows = () => {
    if (storiesScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = storiesScrollRef.current;
      setShowLeftArrow(scrollLeft > 5);
      setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 5);
    }
  };

  const scrollStories = (direction: "left" | "right") => {
    if (storiesScrollRef.current) {
      const { clientWidth } = storiesScrollRef.current;
      const scrollAmount = clientWidth * 0.75;
      storiesScrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  // Keep localStories in sync with server data & update arrows
  useEffect(() => {
    setLocalStories(stories);
    // Delay arrow update slightly to let the browser layout recalculate
    const timer = setTimeout(updateScrollArrows, 300);
    return () => clearTimeout(timer);
  }, [stories]);

  useEffect(() => {
    window.addEventListener("resize", updateScrollArrows);
    return () => window.removeEventListener("resize", updateScrollArrows);
  }, []);

  // Mark story as viewed locally (optimistic update) — stable ref via useCallback
  const handleMarkAsViewedLocal = useCallback(
    (userId: number, storyId: number) => {
      setLocalStories((prev) =>
        prev.map((group) => {
          if (group.user_id !== userId) return group;
          const updatedStories = group.stories.map((s) =>
            s.id === storyId ? { ...s, is_viewed: true } : s,
          );
          return {
            ...group,
            stories: updatedStories,
            has_unviewed: updatedStories.some((s) => !s.is_viewed),
          };
        }),
      );
    },
    [],
  );

  // Delete own story (optimistic remove)
  const handleDeleteStory = useCallback(
    async (storyId: number) => {
      setLocalStories((prev) =>
        prev
          .map((group) => {
            if (group.user_id !== currentUser?.id) return group;
            const updated = group.stories.filter((s) => s.id !== storyId);
            return {
              ...group,
              stories: updated,
              has_unviewed: updated.some((s) => !s.is_viewed),
            };
          })
          .filter((group) => group.stories.length > 0),
      );
      // Also close viewer if no stories remain for this group
      setActiveStoryGroup((prev) => {
        if (!prev || prev.user_id !== currentUser?.id) return prev;
        const remaining = prev.stories.filter((s) => s.id !== storyId);
        return remaining.length > 0 ? { ...prev, stories: remaining } : null;
      });
      await deleteStory(storyId);
    },
    [currentUser?.id],
  );

  // Optimistic update: add newly-created story immediately to the banner
  const handleStoryAdded = (
    mediaUrl: string,
    musicUrl?: string,
    musicTitle?: string,
    musicArtist?: string,
  ) => {
    if (!currentUser) return;
    const newStory = {
      id: -Date.now(), // Temp negative ID — will be replaced on next server fetch
      user_id: currentUser.id,
      media_url: mediaUrl,
      media_type: "image" as const,
      created_at: new Date().toISOString(),
      is_viewed: false,
      music_url: musicUrl ?? null,
      music_title: musicTitle ?? null,
      music_artist: musicArtist ?? null,
    };

    setLocalStories((prev) => {
      const existingGroup = prev.find((g) => g.user_id === currentUser.id);
      if (existingGroup) {
        // Append new story to existing group
        return prev.map((g) =>
          g.user_id === currentUser.id
            ? { ...g, stories: [...g.stories, newStory], has_unviewed: true }
            : g,
        );
      } else {
        // Create a new group for current user and prepend it
        const newGroup = {
          user_id: currentUser.id,
          user_name: currentUser.name,
          user_avatar: currentUser.avatar_url ?? null,
          stories: [newStory],
          has_unviewed: true,
        };
        return [newGroup, ...prev];
      }
    });

    // Scroll the banner to start so the user sees their new story
    setTimeout(() => {
      if (storiesScrollRef.current) {
        storiesScrollRef.current.scrollTo({ left: 0, behavior: "smooth" });
      }
      updateScrollArrows();
    }, 100);
  };

  // Navigate to the next user's story group
  const handleNextUser = () => {
    if (!activeStoryGroup) return;
    const otherGroups = localStories.filter(
      (g) => g.user_id !== currentUser?.id,
    );
    const idx = otherGroups.findIndex(
      (g) => g.user_id === activeStoryGroup.user_id,
    );
    if (idx < otherGroups.length - 1) {
      setActiveStoryGroup(otherGroups[idx + 1]);
    } else {
      setActiveStoryGroup(null);
    }
  };

  // Navigate to the previous user's story group
  const handlePrevUser = () => {
    if (!activeStoryGroup) return;
    const otherGroups = localStories.filter(
      (g) => g.user_id !== currentUser?.id,
    );
    const idx = otherGroups.findIndex(
      (g) => g.user_id === activeStoryGroup.user_id,
    );
    if (idx > 0) {
      setActiveStoryGroup(otherGroups[idx - 1]);
    } else {
      setActiveStoryGroup(null);
    }
  };

  const [groups, setGroups] = useState([
    {
      id: 1,
      name: "Figma Community",
      icon: <FigmaIcon />,
      members: "4.2k membres",
      joined: true,
      desc: "Ressources, templates et discussions autour de Figma.",
    },
    {
      id: 2,
      name: "Sketch Community",
      icon: <SketchIcon />,
      members: "1.8k membres",
      joined: true,
      desc: "Partage de plugins et astuces pour Sketch.",
    },
  ]);

  const [discoverGroups, setDiscoverGroups] = useState([
    {
      id: 3,
      name: "React Creators",
      icon: "⚡",
      members: "1.2k membres",
      desc: "Le groupe francophone des développeurs React & Next.js.",
      joined: false,
    },
    {
      id: 4,
      name: "Beatmakers Paris",
      icon: "🎹",
      members: "840 membres",
      desc: "Partage de prods, conseils MAO et collaborations.",
      joined: false,
    },
    {
      id: 5,
      name: "UI/UX Design FR",
      icon: "🎨",
      members: "2.1k membres",
      desc: "Partage de maquettes, avis et opportunités freelance.",
      joined: false,
    },
  ]);

  // Real Friends & Invitations states
  const [friendRequests, setFriendRequests] = useState<any[]>(
    initialFriendRequests || [],
  );
  const [friendsList, setFriendsList] = useState<any[]>(
    initialFriendsList || [],
  );
  const [suggestionsList, setSuggestionsList] = useState<any[]>(
    initialSuggestions || [],
  );
  const [birthdaysToday, setBirthdaysToday] = useState<any[]>(
    initialBirthdaysToday || [],
  );
  const [friendsSearchQuery, setFriendsSearchQuery] = useState("");
  const [favPostsList, setFavPostsList] = useState<Post[]>(
    isFavoritesFilter ? initialPosts : [],
  );

  // Sync state with props changes
  useEffect(() => {
    setFriendRequests(initialFriendRequests || []);
    setFriendsList(initialFriendsList || []);
    setSuggestionsList(initialSuggestions || []);
    setBirthdaysToday(initialBirthdaysToday || []);
    if (isFavoritesFilter) {
      setFavPostsList(initialPosts);
    }
  }, [
    initialFriendRequests,
    initialFriendsList,
    initialSuggestions,
    initialBirthdaysToday,
    initialPosts,
    isFavoritesFilter,
  ]);

  // Optimistic feed updates
  const [optimisticPosts, addOptimisticPost] = useOptimistic(
    initialPosts,
    (state: Post[], newPost: Post) => [newPost, ...state],
  );

  // Form local states
  const formRef = useRef<HTMLFormElement>(null);
  const [formError, setFormError] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video" | "">("");
  const [mediaTab, setMediaTab] = useState<"image" | "video" | null>(null);
  const [charCount, setCharCount] = useState(0);

  // Live Stream Chat states
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const [liveInput, setLiveInput] = useState("");
  const [liveMessages, setLiveMessages] = useState([
    {
      id: 1,
      name: "Suny Suka",
      text: "Wow Keep it up dude 🔥🔥",
      time: "09:00",
      avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Suny",
    },
    {
      id: 2,
      name: "Arman Bahir",
      text: "Amazing post idea!",
      time: "09:01",
      avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Arman",
    },
    {
      id: 3,
      name: "John Doe",
      text: "Can you show your configuration? 😇",
      time: "09:10",
      avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=John",
    },
    {
      id: 4,
      name: "Stevany Poetri",
      text: "Great quality stream, thanks guys.",
      time: "09:20",
      avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Stevany",
    },
    {
      id: 5,
      name: "Sarah Houdtshon",
      text: "Such a great information guys. 🙌🙌",
      time: "09:22",
      avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Sarah",
    },
  ]);

  // Auto scroll live chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [liveMessages]);

  // Simulate incoming live chat messages
  useEffect(() => {
    const randomUsers = [
      "Sophia",
      "Lucas",
      "Emma",
      "Liam",
      "Olivia",
      "Ethan",
      "Mia",
      "Noah",
      "Chloe",
    ];
    const randomComments = [
      "Awesome stream! 🚀",
      "This layout looks so clean",
      "Greetings from France 🇫🇷",
      "Is the database connection stable?",
      "Can you show the next component?",
      "Super responsive design, works great!",
      "Twinkly is getting better and better! 🔥",
    ];

    const interval = setInterval(() => {
      const randomUser =
        randomUsers[Math.floor(Math.random() * randomUsers.length)];
      const randomComment =
        randomComments[Math.floor(Math.random() * randomComments.length)];
      const timeStr = new Date().toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      });

      setLiveMessages((prev) =>
        [
          ...prev,
          {
            id: Date.now(),
            name: randomUser,
            text: randomComment,
            time: timeStr,
            avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${randomUser}`,
          },
        ].slice(-35),
      ); // Keep only last 35 to prevent lag
    }, 11000);

    return () => clearInterval(interval);
  }, []);

  const handleSendLiveMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!liveInput.trim()) return;
    const timeStr = new Date().toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    setLiveMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: currentUser?.name || "Vous",
        text: liveInput.trim(),
        time: timeStr,
        avatar:
          currentUser?.avatar_url ||
          `https://api.dicebear.com/7.x/adventurer/svg?seed=${currentUser?.name || "Guest"}`,
      },
    ]);
    setLiveInput("");
  };

  const handleJoinGroup = (groupId: number) => {
    setDiscoverGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, joined: true } : g)),
    );
    const joinedGroup = discoverGroups.find((g) => g.id === groupId);
    if (joinedGroup) {
      setGroups((prev) => [
        ...prev,
        {
          id: joinedGroup.id,
          name: joinedGroup.name,
          icon: <span className="text-xs">{joinedGroup.icon}</span>,
          members: joinedGroup.members,
          joined: true,
          desc: joinedGroup.desc,
        },
      ]);
      showAlert(`Vous avez rejoint la communauté "${joinedGroup.name}" ! 🎉`);
    }
  };

  const handleAcceptRequest = (requestId: number) => {
    const req = friendRequests.find((r) => r.id === requestId);
    if (!req) return;
    startTransition(async () => {
      const res = await acceptFriendRequest(requestId);
      if (res.success) {
        setFriendRequests((prev) => prev.filter((r) => r.id !== requestId));
        setFriendsList((prev) => [
          {
            id: req.sender_id,
            name: req.sender_name,
            avatar_url: req.sender_avatar,
            role: req.sender_role,
            is_online: true,
            time: "online",
          },
          ...prev,
        ]);
        showAlert(`Connexion établie avec ${req.sender_name} ! 🤝`);
        router.refresh();
      } else {
        showAlert(res.message || "Une erreur est survenue.");
      }
    });
  };

  const handleDeclineRequest = (requestId: number) => {
    startTransition(async () => {
      const res = await declineFriendRequest(requestId);
      if (res.success) {
        setFriendRequests((prev) => prev.filter((r) => r.id !== requestId));
        showAlert(`Invitation déclinée.`);
      } else {
        showAlert(res.message || "Une erreur est survenue.");
      }
    });
  };

  const handleSendRequest = (targetUserId: number) => {
    startTransition(async () => {
      const res = await sendFriendRequest(targetUserId);
      if (res.success) {
        setSuggestionsList((prev) =>
          prev.map((s) =>
            s.id === targetUserId ? { ...s, has_sent_request: true } : s,
          ),
        );
        showAlert(`Invitation envoyée ! ✉️`);
      } else {
        showAlert(res.message || "Une erreur est survenue.");
      }
    });
  };

  const handleCancelRequest = (targetUserId: number) => {
    startTransition(async () => {
      const res = await cancelFriendRequest(targetUserId);
      if (res.success) {
        setSuggestionsList((prev) =>
          prev.map((s) =>
            s.id === targetUserId ? { ...s, has_sent_request: false } : s,
          ),
        );
        showAlert(`Invitation annulée.`);
      } else {
        showAlert(res.message || "Une erreur est survenue.");
      }
    });
  };

  const handleUnfriend = (friendId: number, friendName: string) => {
    startTransition(async () => {
      const res = await unfriend(friendId);
      if (res.success) {
        setFriendsList((prev) => prev.filter((f) => f.id !== friendId));
        showAlert(`Vous n'êtes plus ami avec ${friendName}.`);
        router.refresh();
      } else {
        showAlert(res.message || "Une erreur est survenue.");
      }
    });
  };

  const handleToggleFavorite = (postId: number) => {
    setFavPostsList((prev) => prev.filter((post) => post.id !== postId));
    startTransition(async () => {
      const res = await toggleFavorite(postId);
      if (res.success) {
        showAlert("Publication retirée des favoris. ⭐");
        router.refresh();
      } else {
        showAlert(res.message || "Une erreur est survenue.");
        router.refresh();
      }
    });
  };

  const handleClearAllFavorites = () => {
    setFavPostsList([]);
    startTransition(async () => {
      const res = await clearAllFavorites();
      if (res.success) {
        showAlert("Tous les favoris ont été retirés. ⭐");
        router.refresh();
      } else {
        showAlert(res.message || "Une erreur est survenue.");
        router.refresh();
      }
    });
  };

  const handleLogout = () => {
    startTransition(async () => {
      await logout();
      router.push("/login");
    });
  };

  const clearMedia = () => {
    setMediaUrl("");
    setMediaType("");
    setMediaTab(null);
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "image" | "video",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      await showAlert("Le fichier est trop volumineux. Maximum 5 Mo.");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        setMediaUrl(reader.result);
        setMediaType(type);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFormAction = async (formData: FormData) => {
    const content = formData.get("content") as string;
    if (!content?.trim() && !mediaUrl) {
      setFormError("La publication doit avoir du texte ou un média.");
      return;
    }
    setFormError("");

    const optimisticPost: Post = {
      id: -Date.now(),
      user_id: currentUser?.id || 0,
      content: content || null,
      media_url: mediaUrl || null,
      media_type: (mediaType as "image" | "video") || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      author_name: currentUser?.name || "Vous",
      author_avatar: currentUser?.avatar_url || null,
      author_role: currentUser?.role || "Premium User",
      likes_count: 0,
      comments_count: 0,
      user_has_liked: false,
      user_has_favorited: false,
      user_reaction: null,
      reactions_by_type: {
        like: 0,
        love: 0,
        haha: 0,
        wow: 0,
        sad: 0,
        angry: 0,
      },
    };

    formRef.current?.reset();
    setMediaUrl("");
    setMediaType("");
    setMediaTab(null);
    setCharCount(0);

    startTransition(async () => {
      addOptimisticPost(optimisticPost);
      const result = await createPost(undefined, formData);
      if (result?.message && !result.success) {
        setFormError(result.message);
      }
    });
  };

  const NAVIGATION_TABS = [
    {
      id: "home",
      icon: HomeIcon,
      href: "#",
      active: activeTab === "home" && !isFavoritesFilter,
    },
    { id: "network", icon: Users, href: "#", active: activeTab === "network" },
    { id: "messages", icon: MessageSquare, href: "/messages", active: false },
    {
      id: "favorites",
      icon: Bookmark,
      href: "/?filter=favorites",
      active: isFavoritesFilter,
    },
    { id: "profile", icon: User, href: "/profile", active: false },
    { id: "settings", icon: Settings, href: "/profile", active: false },
  ];

  // ─── LANDING PAGE FOR UNAUTHENTICATED USERS ───
  if (!currentUser) {
    return (
      <div className="relative flex flex-col min-h-screen bg-zinc-950 font-sans text-zinc-100 overflow-hidden">
        {/* Background glows */}
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-600/10 blur-[120px] pointer-events-none" />

        <header className="relative z-10 flex items-center justify-between max-w-6xl mx-auto w-full px-6 py-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-violet-600 flex items-center justify-center font-bold text-white shadow-lg shadow-violet-500/20">
              T
            </div>
            <span className="font-extrabold tracking-tight text-white text-base">
              Twinkly
            </span>
          </div>
          <Link href="/login">
            <Button
              size="sm"
              className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-200 rounded-xl px-4 text-xs font-semibold"
            >
              Se connecter
            </Button>
          </Link>
        </header>

        <main className="relative z-10 flex-1 max-w-6xl mx-auto w-full px-6 flex flex-col justify-center items-center py-12">
          <div className="text-center space-y-6 max-w-3xl mx-auto animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-950/30 border border-violet-800/30 text-violet-400 text-xs font-semibold mb-2">
              <Sparkles className="h-3.5 w-3.5" /> Une expérience utilisateur
              premium
            </div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tight leading-none bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent select-none">
              Connectez-vous à la communauté
            </h1>
            <p className="text-sm md:text-base text-zinc-400 max-w-xl mx-auto leading-relaxed">
              Créez un profil, partagez du texte, des images et des vidéos, et
              suivez les publications de la communauté en temps réel.
            </p>
            <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
              <Link href="/signup">
                <Button
                  size="lg"
                  className="h-12 px-6 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-bold rounded-xl shadow-xl shadow-violet-500/20 transition-all duration-300 hover:scale-[1.02]"
                >
                  Commencer maintenant <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16 text-left">
              {[
                {
                  icon: "📝",
                  title: "Publications riches",
                  desc: "Partagez du texte, des images et des vidéos avec la communauté dans un fil chronologique.",
                },
                {
                  icon: "🛡️",
                  title: "Sécurité JWT",
                  desc: "Sessions chiffrées en cookies HttpOnly pour une protection maximale contre les failles XSS.",
                },
                {
                  icon: "🎨",
                  title: "Profils personnalisés",
                  desc: "Avatar, biographie et informations entièrement personnalisables pour chaque membre.",
                },
              ].map((feat) => (
                <div
                  key={feat.title}
                  className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md space-y-3"
                >
                  <div className="h-10 w-10 rounded-xl bg-violet-600/10 flex items-center justify-center text-lg border border-violet-500/20">
                    {feat.icon}
                  </div>
                  <h3 className="font-bold text-zinc-200">{feat.title}</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Build the right sidebar content (live stream widget)
  const rightSidebarContent = (
    <>
      {/* Live Stream Widget */}
      <div className="rounded-[28px] border border-slate-200/60 bg-white overflow-hidden shadow-xs flex flex-col h-[560px] flex-shrink-0">
        <div className="relative h-44 flex-shrink-0 bg-slate-900 overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop"
            className="w-full h-full object-cover opacity-85"
            alt="Live Stream"
          />
          <div className="absolute top-3 left-3 flex items-center gap-1.5">
            <span className="bg-rose-600 text-white text-[8px] font-black tracking-wider uppercase px-2 py-0.5 rounded-md shadow-sm animate-pulse">
              Live
            </span>
            <span className="bg-black/60 backdrop-blur-xs text-white text-[8px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
              <Users className="h-2.5 w-2.5" /> 3456
            </span>
          </div>
        </div>
        <div className="flex-1 bg-[#0b1b3d] text-white p-4 flex flex-col justify-between min-h-0">
          <div className="flex items-center justify-between pb-2 border-b border-white/10 flex-shrink-0">
            <span className="text-[10px] font-black tracking-widest text-white/90 uppercase">
              Live Chat
            </span>
            <span className="text-[9px] text-white/50 font-semibold">
              1.5k Peoples
            </span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 my-2 flex items-start gap-2 flex-shrink-0">
            <span className="bg-blue-600 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md mt-0.5">
              Pinned
            </span>
            <p className="text-[10px] text-slate-200 leading-tight">
              How to make Youtube subscriber grow faster.
            </p>
          </div>
          <div
            ref={chatScrollRef}
            className="flex-1 overflow-y-auto scrollbar-hide space-y-3 pr-1 my-2 min-h-0"
          >
            {liveMessages.map((msg) => (
              <div
                key={msg.id}
                className="flex items-start gap-2.5 animate-in fade-in slide-in-from-bottom-1 duration-200"
              >
                <img
                  src={msg.avatar}
                  className="h-6 w-6 rounded-full bg-white/10 flex-shrink-0 border border-white/10"
                  alt=""
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-white/80">
                      {msg.name}
                    </span>
                    <span className="text-[8px] text-white/40">{msg.time}</span>
                  </div>
                  <p className="text-[10px] text-slate-200 mt-0.5 leading-relaxed break-words">
                    {msg.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <form
            onSubmit={handleSendLiveMessage}
            className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl p-1.5 mt-2 flex-shrink-0"
          >
            <button
              type="button"
              className="p-1.5 text-white/40 hover:text-white transition-colors"
            >
              <Smile className="h-4 w-4" />
            </button>
            <input
              type="text"
              value={liveInput}
              onChange={(e) => setLiveInput(e.target.value)}
              placeholder="Add your comment"
              className="flex-1 bg-transparent border-0 text-[10px] text-white placeholder-white/30 focus:outline-none focus:ring-0 focus:ring-offset-0"
            />
            <button
              type="submit"
              className="h-7 w-7 rounded-lg bg-blue-600 hover:bg-blue-500 flex items-center justify-center text-white transition-colors"
            >
              <Send className="h-3 w-3" />
            </button>
          </form>
        </div>
      </div>
    </>
  );

  return (
    <>
      <AppShell currentUser={currentUser!} rightSidebar={rightSidebarContent}>
        {/* Dynamic Stories Banner */}
        <div className="relative group/stories w-full select-none">
          {/* Left Scroll Button */}
          {showLeftArrow && (
            <button
              type="button"
              onClick={() => scrollStories("left")}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full bg-white/90 hover:bg-white hover:scale-105 text-slate-700 hover:text-slate-900 border border-slate-250 shadow-md flex items-center justify-center transition-all duration-200"
              aria-label="Faire défiler à gauche"
            >
              <ChevronLeft className="h-4.5 w-4.5" />
            </button>
          )}

          {/* Right Scroll Button */}
          {showRightArrow && (
            <button
              type="button"
              onClick={() => scrollStories("right")}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full bg-white/90 hover:bg-white hover:scale-105 text-slate-700 hover:text-slate-900 border border-slate-250 shadow-md flex items-center justify-center transition-all duration-200"
              aria-label="Faire défiler à droite"
            >
              <ChevronRight className="h-4.5 w-4.5" />
            </button>
          )}

          {/* Scrollable Container */}
          <div
            ref={storiesScrollRef}
            onScroll={updateScrollArrows}
            className="flex items-center gap-3 overflow-x-auto scrollbar-hide py-1.5 px-0.5"
          >
            {/* Create Story Card */}
            {currentUser && (
              <div
                onClick={() => setIsAddStoryOpen(true)}
                className="group relative flex flex-col w-[112px] h-[192px] sm:w-[128px] sm:h-[208px] rounded-2xl overflow-hidden border border-slate-200/60 bg-white cursor-pointer hover:shadow-md transition-all duration-300 flex-shrink-0"
              >
                {/* Top 70% (Avatar Image or Default banner) */}
                <div className="relative flex-[7] overflow-hidden bg-slate-100">
                  {currentUser.avatar_url ? (
                    <img
                      src={currentUser.avatar_url}
                      alt="Votre profil"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 bg-slate-50"
                    />
                  ) : (
                    <div className="h-full w-full bg-slate-200 flex items-center justify-center text-slate-400 rounded-full">
                      <User className="h-4.5 w-4.5" />
                    </div>
                  )}
                </div>

                {/* Middle Plus Button overlapping */}
                <div className="absolute left-1/2 -translate-x-1/2 top-[70%] -translate-y-1/2 z-10">
                  <div className="h-8 w-8 rounded-full bg-blue-600 border-4 border-white flex items-center justify-center text-white shadow-md transition-transform duration-200 group-hover:scale-110 active:scale-95">
                    <Plus className="h-4 w-4 stroke-[3]" />
                  </div>
                </div>

                {/* Bottom 30% Text */}
                <div className="flex-[3] bg-slate-50/50 flex items-end justify-center pb-2.5 pt-3.5 rounded-b-2xl px-1">
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 leading-tight text-center">
                    Créer une story
                  </span>
                </div>
              </div>
            )}

            {/* Active Stories Cards */}
            {localStories.map((group) => {
              const isOwnStory = group.user_id === currentUser?.id;
              const displayName = isOwnStory ? "Votre story" : group.user_name;
              const firstStory = group.stories[0];
              if (!firstStory) return null;

              return (
                <div
                  key={group.user_id}
                  onClick={() => setActiveStoryGroup(group)}
                  className="group relative flex flex-col w-[112px] h-[192px] sm:w-[128px] sm:h-[208px] rounded-2xl overflow-hidden bg-slate-900 cursor-pointer shadow-xs hover:shadow-md transition-all duration-300 flex-shrink-0"
                >
                  {/* Media Background */}
                  <div className="absolute inset-0 z-0">
                    {firstStory.media_type === "image" ? (
                      <img
                        src={firstStory.media_url}
                        alt=""
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <video
                        src={firstStory.media_url}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        muted
                        playsInline
                      />
                    )}
                  </div>

                  {/* Bottom Gradient overlay */}
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/30 to-transparent z-1" />

                  {/* User Avatar in Top-Left */}
                  <div
                    className={`absolute top-3.5 left-3.5 p-0.5 rounded-full z-10 ${
                      group.has_unviewed
                        ? "bg-gradient-to-tr from-blue-500 via-purple-500 to-pink-500"
                        : "bg-slate-200"
                    } ring-2 ring-white/60 shadow-md`}
                  >
                    <div className="h-7 w-7 rounded-full overflow-hidden bg-white p-0.5">
                      {group.user_avatar ? (
                        <img
                          src={group.user_avatar}
                          alt=""
                          className="h-full w-full object-cover rounded-full"
                        />
                      ) : (
                        <div className="h-full w-full bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-650">
                          {group.user_name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* User Name at the Bottom */}
                  <div className="absolute bottom-3 left-3 right-3 z-10 text-left">
                    <span className="text-[10px] sm:text-[11px] font-bold text-white leading-tight drop-shadow-md truncate block">
                      {displayName}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 text-xs">
            {error}
          </div>
        )}

        {/* ─── HOME VIEW (FEED & CREATE POST) ─── */}
        {activeTab === "home" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Create Post Form */}
            {!isFavoritesFilter && (
              <div className="rounded-[24px] bg-white border border-slate-200/60 p-4 space-y-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full overflow-hidden border border-slate-200 bg-slate-50 flex-shrink-0">
                    {currentUser.avatar_url ? (
                      <img
                        src={currentUser.avatar_url}
                        alt="Avatar"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-slate-100 text-slate-400">
                        <User className="h-4.5 w-4.5" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 leading-none">
                      {currentUser.name}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Partager vos actualités avec la communauté
                    </p>
                  </div>
                </div>

                <form
                  ref={formRef}
                  action={handleFormAction}
                  className="space-y-3"
                >
                  <input type="hidden" name="media_url" value={mediaUrl} />
                  <input type="hidden" name="media_type" value={mediaType} />

                  <div className="relative">
                    <textarea
                      name="content"
                      rows={3}
                      maxLength={1000}
                      onChange={(e) => setCharCount(e.target.value.length)}
                      placeholder="Quoi de neuf ? Partagez quelque chose avec la communauté..."
                      className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-3 text-xs text-slate-800 placeholder-slate-400 resize-none focus:outline-none focus:border-blue-500/50 transition-colors"
                    />
                    <span
                      className={`absolute bottom-3 right-3 text-[10px] ${charCount > 900 ? "text-rose-500" : "text-slate-400"}`}
                    >
                      {charCount}/1000
                    </span>
                  </div>

                  {formError && (
                    <p className="text-rose-500 text-[10px] pl-1">
                      {formError}
                    </p>
                  )}

                  {mediaUrl && (
                    <div className="relative rounded-2xl overflow-hidden border border-slate-200 max-h-64 shadow-xs">
                      {mediaType === "image" ? (
                        <img
                          src={mediaUrl}
                          alt="Aperçu"
                          className="w-full h-64 object-cover"
                        />
                      ) : (
                        <video
                          src={mediaUrl}
                          controls
                          className="w-full h-64 object-cover bg-black"
                        />
                      )}
                      <button
                        type="button"
                        onClick={clearMedia}
                        className="absolute top-2 right-2 h-7 w-7 flex items-center justify-center bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {!mediaUrl && mediaTab && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
                      {mediaTab === "image" && (
                        <>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Choisir une image
                          </p>
                          <div className="grid grid-cols-4 gap-2">
                            {PRESET_IMAGES.map((p) => (
                              <button
                                key={p.url}
                                type="button"
                                onClick={() => {
                                  setMediaUrl(p.url);
                                  setMediaType("image");
                                  setMediaTab(null);
                                }}
                                className="relative h-14 rounded-xl overflow-hidden border border-slate-200 hover:border-blue-500 transition-all group"
                              >
                                <img
                                  src={p.url}
                                  alt={p.label}
                                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                                />
                                <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] text-center py-0.5">
                                  {p.label}
                                </span>
                              </button>
                            ))}
                          </div>
                          <label className="flex items-center justify-center gap-2 border border-dashed border-slate-300 rounded-xl p-2.5 cursor-pointer hover:border-blue-500 transition-colors text-xs text-slate-500 hover:text-blue-600">
                            <ImageIcon className="h-4 w-4" />
                            Choisir un fichier image
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleFileUpload(e, "image")}
                              className="hidden"
                            />
                          </label>
                        </>
                      )}
                      {mediaTab === "video" && (
                        <>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Choisir une vidéo
                          </p>
                          <div className="space-y-2">
                            {PRESET_VIDEOS.map((p) => (
                              <button
                                key={p.url}
                                type="button"
                                onClick={() => {
                                  setMediaUrl(p.url);
                                  setMediaType("video");
                                  setMediaTab(null);
                                }}
                                className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/10 transition-all text-left"
                              >
                                <div className="h-8 w-14 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200 flex-shrink-0">
                                  <Video className="h-4 w-4 text-blue-500" />
                                </div>
                                <span className="text-xs font-semibold text-slate-700">
                                  {p.label}
                                </span>
                              </button>
                            ))}
                          </div>
                          <label className="flex items-center justify-center gap-2 border border-dashed border-slate-300 rounded-xl p-2.5 cursor-pointer hover:border-blue-500 transition-colors text-xs text-slate-500 hover:text-blue-600">
                            <Video className="h-4 w-4" />
                            Choisir un fichier vidéo
                            <input
                              type="file"
                              accept="video/*"
                              onChange={(e) => handleFileUpload(e, "video")}
                              className="hidden"
                            />
                          </label>
                        </>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setMediaTab(mediaTab === "image" ? null : "image")
                        }
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          mediaTab === "image"
                            ? "bg-blue-50 text-blue-600 border border-blue-100"
                            : "text-slate-500 hover:text-blue-600 hover:bg-slate-100"
                        }`}
                      >
                        <ImageIcon className="h-3.5 w-3.5" /> Photo
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setMediaTab(mediaTab === "video" ? null : "video")
                        }
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          mediaTab === "video"
                            ? "bg-cyan-50 text-cyan-600 border border-cyan-100"
                            : "text-slate-500 hover:text-cyan-600 hover:bg-slate-100"
                        }`}
                      >
                        <Video className="h-3.5 w-3.5" /> Vidéo
                      </button>
                    </div>

                    <Button
                      type="submit"
                      disabled={isPending}
                      className="h-9 px-5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-xs transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <span className="flex items-center gap-1.5">
                          Publier <Send className="h-3 w-3" />
                        </span>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Feed Posts */}
            <div className="space-y-5">
              {optimisticPosts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 text-slate-400 gap-3">
                  <Bookmark className="h-8 w-8 text-slate-300" />
                  <p className="text-xs font-medium">
                    {isFavoritesFilter
                      ? "Aucune publication enregistrée en favoris."
                      : "Aucune publication disponible."}
                  </p>
                </div>
              ) : (
                optimisticPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    currentUser={currentUser}
                    variant="dashboard"
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* ─── COMMUNITIES & FRIENDS VIEW (NETWORK) ─── */}
        {activeTab === "network" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* View Header */}
            <div className="pb-1">
              <h2 className="text-xl font-bold tracking-tight text-slate-800">
                Amis &amp; Invitations
              </h2>
              <p className="text-xs text-slate-450 mt-1">
                Gérez vos connexions, vos invitations et découvrez de nouveaux
                profils.
              </p>
            </div>

            {/* 1. Demandes d'ami */}
            <div className="bg-white border border-slate-200/60 rounded-[28px] p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pl-1">
                <h3 className="text-xs font-bold text-slate-450 uppercase tracking-widest">
                  Demandes d'ami ({friendRequests.length})
                </h3>
              </div>

              {friendRequests.length === 0 ? (
                <p className="text-xs text-slate-450 italic pl-1">
                  Aucune demande en attente. ✨
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {friendRequests.map((req) => (
                    <div
                      key={req.id}
                      className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 flex flex-col justify-between gap-3 hover:shadow-xs transition-shadow"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0">
                          {req.sender_avatar ? (
                            <img
                              src={req.sender_avatar}
                              className="h-full w-full object-cover"
                              alt=""
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-slate-400">
                              <User className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/profile/${req.sender_id}`}
                            className="text-xs font-bold text-slate-800 hover:text-blue-600 transition-colors truncate block"
                          >
                            {req.sender_name}
                          </Link>
                          <p className="text-[10px] text-slate-400 font-semibold truncate">
                            {req.sender_role || "Membre Twinkly"}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcceptRequest(req.id)}
                          className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-bold shadow-xs transition-colors cursor-pointer"
                        >
                          Confirmer
                        </button>
                        <button
                          onClick={() => handleDeclineRequest(req.id)}
                          className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-xl text-[10px] font-bold transition-colors cursor-pointer"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Suggestions d'amis (Vous connaissez peut-être...) */}
            <div className="bg-white border border-slate-200/60 rounded-[28px] p-5 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-450 uppercase tracking-widest pl-1">
                Vous connaissez peut-être...
              </h3>

              {suggestionsList.length === 0 ? (
                <p className="text-xs text-slate-455 italic pl-1">
                  Aucune suggestion pour le moment. ✨
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {suggestionsList.map((s) => {
                    const profilePath = `/profile/${s.id}`;
                    return (
                      <div
                        key={s.id}
                        className="border border-slate-100 rounded-2xl p-4 bg-slate-50/30 flex flex-col justify-between gap-3 hover:shadow-xs transition-shadow"
                      >
                        <div className="flex items-start gap-3">
                          <Link
                            href={profilePath}
                            className="h-12 w-12 rounded-full overflow-hidden border border-slate-250 bg-slate-50 flex-shrink-0 hover:scale-105 transition-transform"
                          >
                            {s.avatar_url ? (
                              <img
                                src={s.avatar_url}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full bg-slate-100 flex items-center justify-center text-slate-400">
                                <User className="h-5 w-5" />
                              </div>
                            )}
                          </Link>
                          <div className="min-w-0 flex-1">
                            <Link
                              href={profilePath}
                              className="text-xs font-bold text-slate-800 hover:text-blue-600 transition-colors truncate block"
                            >
                              {s.name}
                            </Link>
                            <p className="text-[9px] text-slate-400 font-bold truncate mt-0.5">
                              {s.role || "Membre Twinkly"}
                            </p>

                            {/* Suggestion reason pill */}
                            <span className="inline-block bg-blue-50 text-blue-650 text-[8px] font-bold px-1.5 py-0.5 rounded-md mt-2 max-w-full truncate">
                              {s.reason}
                            </span>
                          </div>
                        </div>

                        <div className="pt-1">
                          {s.has_sent_request ? (
                            <button
                              onClick={() => handleCancelRequest(s.id)}
                              className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-bold transition-colors cursor-pointer"
                            >
                              Annuler l'invitation
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSendRequest(s.id)}
                              className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1"
                            >
                              <UserPlus className="h-3 w-3" /> Ajouter
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Tous les amis & Anniversaires */}
            <div className="bg-white border border-slate-200/60 rounded-[28px] p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <h3 className="text-xs font-bold text-slate-455 uppercase tracking-widest pl-1 select-none">
                  Tous les amis ({friendsList.length})
                </h3>

                {/* Search bar inside friends section */}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Rechercher un ami..."
                    value={friendsSearchQuery}
                    onChange={(e) => setFriendsSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500/50 transition-colors"
                  />
                </div>
              </div>

              {/* Today's Birthdays Banner */}
              {birthdaysToday.length > 0 && (
                <div className="rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4 flex items-start gap-3.5 shadow-2xs select-none animate-in slide-in-from-top duration-300">
                  <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0 animate-bounce">
                    <Cake className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-amber-850">
                      Anniversaire aujourd'hui ! 🎂
                    </h4>
                    <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                      C'est l'anniversaire de{" "}
                      <span className="font-extrabold text-slate-800">
                        {birthdaysToday.map((b) => b.name).join(", ")}
                      </span>
                      . Souhaitez-leur une excellente journée ! 🎉
                    </p>
                  </div>
                </div>
              )}

              {/* Friends Grid */}
              {friendsList.length === 0 ? (
                <p className="text-xs text-slate-450 italic pl-1 py-4">
                  Vous n'avez pas encore d'amis dans votre liste. Utilisez les
                  suggestions pour vous connecter ! 🤝
                </p>
              ) : friendsList.filter((f) =>
                  f.name
                    .toLowerCase()
                    .includes(friendsSearchQuery.toLowerCase()),
                ).length === 0 ? (
                <p className="text-xs text-slate-450 italic pl-1 py-4">
                  Aucun ami ne correspond à votre recherche.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {friendsList
                    .filter((f) =>
                      f.name
                        .toLowerCase()
                        .includes(friendsSearchQuery.toLowerCase()),
                    )
                    .map((friend) => (
                      <div
                        key={friend.id}
                        className="border border-slate-100 rounded-2xl p-4 bg-slate-50/20 flex flex-col justify-between gap-3 hover:bg-slate-50/50 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0">
                            {friend.avatar_url ? (
                              <img
                                src={friend.avatar_url}
                                className="h-full w-full object-cover"
                                alt=""
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-slate-400">
                                <User className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/profile/${friend.id}`}
                              className="text-xs font-bold text-slate-800 hover:text-blue-600 transition-colors truncate block"
                            >
                              {friend.name}
                            </Link>
                            <p className="text-[9px] text-slate-400 font-bold truncate mt-0.5">
                              {friend.role || "Membre"}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Link
                            href={`/profile/${friend.id}`}
                            className="flex-1"
                          >
                            <button className="w-full py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-650 rounded-lg text-[9px] font-bold transition-colors cursor-pointer">
                              Profil
                            </button>
                          </Link>
                          <button
                            onClick={() =>
                              handleUnfriend(friend.id, friend.name)
                            }
                            className="flex-1 py-1 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-100 text-slate-500 hover:text-rose-600 rounded-lg text-[9px] font-bold transition-colors cursor-pointer"
                          >
                            Retirer
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── FAVORITES VIEW ─── */}
        {activeTab === "favorites" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* View Header with Actions */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 select-none">
              <div>
                <h2 className="mt-5 text-xl font-bold tracking-tight text-slate-800 uppercase">
                  My Favorite Posts List
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger className="h-8 px-3 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold border-0 rounded-lg flex items-center gap-1 cursor-pointer">
                    Actions <ChevronDown className="h-3.5 w-3.5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="bg-white border border-slate-200 text-slate-800 rounded-xl shadow-md min-w-40"
                  >
                    <DropdownMenuItem
                      onClick={() => router.refresh()}
                      className="text-xs px-3 py-2 cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      Actualiser
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleClearAllFavorites}
                      variant="destructive"
                      className="text-xs px-3 py-2 cursor-pointer hover:bg-rose-50 text-rose-600 transition-colors"
                    >
                      Vider la liste
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Grid of Favorite Posts */}
            {favPostsList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-slate-200 text-slate-400 gap-3 select-none mt-[30px]">
                <Bookmark className="h-9 w-9 text-slate-300 animate-pulse" />
                <p className="text-xs font-semibold text-slate-455">
                  Aucune publication dans vos favoris.
                </p>
                <p className="text-[10px] text-slate-400">
                  Ajoutez des publications à vos favoris pour les retrouver ici.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-[30px]">
                {favPostsList.map((post) => {
                  // Fallback images if post has no media
                  const fallbacks = [
                    "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?q=80&w=600&auto=format&fit=crop", // KFC/food style
                    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop", // Greece houses
                    "https://images.unsplash.com/photo-1506157786151-b8491531f063?q=80&w=600&auto=format&fit=crop", // Neon/light circles
                    "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=600&auto=format&fit=crop", // Pizza
                    "https://images.unsplash.com/photo-1500648767791-00dcc994a43E?q=80&w=600&auto=format&fit=crop", // Portrait male
                    "https://images.unsplash.com/photo-1514565131-fce0801e5785?q=80&w=600&auto=format&fit=crop", // City night street
                  ];
                  const mediaSrc =
                    post.media_url || fallbacks[post.id % fallbacks.length];

                  // Dynamic title: capitalized, matching image styling
                  const rawText = post.content || "";
                  // Strip emojis/newlines and truncate
                  const cleanText = rawText
                    .replace(
                      /[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g,
                      "",
                    )
                    .replace(/\n/g, " ")
                    .trim();
                  const displayTitle = (
                    cleanText.length > 40
                      ? cleanText.substring(0, 40).trim() + "..."
                      : cleanText ||
                        "THE INDUSTRY'S STANDARD DUMMY TEXT EVER SINCE..."
                  ).toUpperCase();

                  // Dynamic description: truncated
                  const displayDesc =
                    rawText ||
                    "Lorem Ipsum is simply dummy text of the printing and typesetting industry.";

                  return (
                    <div
                      key={post.id}
                      className="group bg-white rounded-3xl border border-slate-200/60 overflow-hidden flex flex-col h-full hover:shadow-md transition-all duration-300 relative animate-in fade-in duration-200"
                    >
                      {/* Image area wrapper without overflow-hidden */}
                      <div className="relative w-full">
                        {/* Inner image container with aspect ratio and overflow-hidden */}
                        <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100 rounded-t-3xl">
                          <img
                            src={mediaSrc}
                            alt="Favorite Post"
                            className="h-full w-full object-cover group-hover:scale-102 transition-transform duration-500"
                          />
                        </div>
                        {/* Star Badge Overlap placed outside overflow-hidden inner area */}
                        <button
                          type="button"
                          onClick={() => handleToggleFavorite(post.id)}
                          className="absolute -bottom-5 right-5 z-20 h-10 w-10 rounded-full bg-[#581c87] hover:bg-[#4a148c] text-white flex items-center justify-center shadow-lg border-2 border-white hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer"
                          title="Retirer des favoris"
                        >
                          <Star className="h-4.5 w-4.5 fill-white text-white" />
                        </button>
                      </div>

                      {/* Details area */}
                      <div className="pt-7 px-5 pb-5 flex flex-col justify-between flex-1 gap-2.5">
                        <div className="space-y-1.5">
                          <h4 className="text-xs font-black tracking-tight text-slate-800 uppercase line-clamp-2 min-h-[32px] leading-tight">
                            {displayTitle}
                          </h4>
                          <p className="text-[10px] sm:text-[11px] text-slate-400 font-bold leading-normal line-clamp-2">
                            {displayDesc}
                          </p>
                          
                          {/* Publisher info */}
                          <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 mt-2 select-none">
                            <Link 
                              href={post.user_id === currentUser?.id ? '/profile' : `/profile/${post.user_id}`}
                              className="flex items-center gap-2 group/author cursor-pointer"
                            >
                              <div className="h-6 w-6 rounded-full overflow-hidden border border-slate-200 bg-slate-55 flex-shrink-0 group-hover/author:ring-2 group-hover/author:ring-violet-500/20 transition-all duration-300">
                                {post.author_avatar ? (
                                  <img src={post.author_avatar} alt={post.author_name} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center bg-slate-100 text-slate-400">
                                    <User className="h-3 w-3" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[9px] text-slate-400 font-bold leading-none">Publié par</p>
                                <p className="text-[10px] font-black text-slate-750 group-hover/author:text-blue-600 transition-colors mt-0.5 truncate max-w-[120px]">
                                  {post.author_name}
                                </p>
                              </div>
                            </Link>

                            <span className="text-[9px] text-slate-400 font-bold bg-slate-50 border border-slate-100 rounded-md px-1.5 py-0.5">
                              {new Date(post.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <footer className="py-6 text-center text-[10px] text-slate-400 font-medium">
          <p>
            &copy; 2026 Twinkly Inc. Conçu avec amour, Next.js 16 et Tailwind
            CSS v4.
          </p>
        </footer>
      </AppShell>

      {/* Add Story Dialog */}
      <AddStoryDialog
        isOpen={isAddStoryOpen}
        onClose={() => setIsAddStoryOpen(false)}
        currentUser={currentUser}
        onStoryAdded={handleStoryAdded}
      />

      {/* Fullscreen Story Slideshow Viewer */}
      {activeStoryGroup && (
        <StoryViewer
          activeGroup={activeStoryGroup}
          groups={localStories}
          onSelectGroup={(group) => setActiveStoryGroup(group)}
          currentUser={currentUser}
          onClose={() => setActiveStoryGroup(null)}
          onStoryViewed={(storyId) =>
            handleMarkAsViewedLocal(activeStoryGroup.user_id, storyId)
          }
          onDeleteStory={handleDeleteStory}
          onNextUser={handleNextUser}
          onPrevUser={handlePrevUser}
          onAddStoryClick={() => setIsAddStoryOpen(true)}
        />
      )}
    </>
  );
}
