'use server';

import { sql } from '@vercel/postgres';
import { getCurrentUser } from '@/lib/session';
import { PostSchema, PostFormState } from '@/lib/definitions';
import { revalidatePath } from 'next/cache';

export async function createPost(state: PostFormState, formData: FormData): Promise<PostFormState> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { message: 'Vous devez être connecté pour publier.' };
  }

  const validatedFields = PostSchema.safeParse({
    content: formData.get('content'),
    media_url: formData.get('media_url'),
    media_type: formData.get('media_type'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { content, media_url, media_type } = validatedFields.data;

  try {
    await sql`
      INSERT INTO posts (user_id, content, media_url, media_type)
      VALUES (
        ${currentUser.id},
        ${content || null},
        ${media_url || null},
        ${media_type || null}
      )
    `;

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error creating post:', error);
    return { message: 'Une erreur est survenue lors de la création de la publication.' };
  }
}

export async function updatePost(state: PostFormState, formData: FormData): Promise<PostFormState> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { message: 'Vous devez être connecté pour modifier une publication.' };
  }

  const postId = formData.get('post_id');
  if (!postId) {
    return { message: 'Publication introuvable.' };
  }

  const validatedFields = PostSchema.safeParse({
    content: formData.get('content'),
    media_url: formData.get('media_url'),
    media_type: formData.get('media_type'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { content, media_url, media_type } = validatedFields.data;

  try {
    // Verify ownership before updating
    const ownership = await sql`
      SELECT id FROM posts WHERE id = ${postId as string} AND user_id = ${currentUser.id}
    `;
    if (ownership.rows.length === 0) {
      return { message: 'Vous n êtes pas autorisé à modifier cette publication.' };
    }

    await sql`
      UPDATE posts
      SET content = ${content || null},
          media_url = ${media_url || null},
          media_type = ${media_type || null},
          updated_at = NOW()
      WHERE id = ${postId as string} AND user_id = ${currentUser.id}
    `;

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error updating post:', error);
    return { message: 'Une erreur est survenue lors de la modification de la publication.' };
  }
}

export async function deletePost(postId: number): Promise<void> {
  const currentUser = await getCurrentUser();
  if (!currentUser) return;

  try {
    await sql`
      DELETE FROM posts
      WHERE id = ${postId} AND user_id = ${currentUser.id}
    `;
    revalidatePath('/');
  } catch (error) {
    console.error('Error deleting post:', error);
  }
}
