import { supabase } from '../lib/supabaseClient';
import type { Article } from '../types';

export async function getLatestArticles(maxCount = 50): Promise<Article[]> {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .order('published_at', { ascending: false })
    .limit(maxCount);
  if (error) {
    console.error('getLatestArticles error:', error);
    return [];
  }
  return data as Article[];
}

export async function getBreakingNews(): Promise<Article[]> {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('is_breaking', true)
    .order('published_at', { ascending: false })
    .limit(10);
  if (error) {
    console.error('getBreakingNews error:', error);
    return [];
  }
  return data as Article[];
}

export async function getArticles(limitCount = 100, constraints: any[] = []): Promise<Article[]> {
  let query = supabase.from('articles').select('*').order('published_at', { ascending: false }).limit(limitCount);
  // Note: The 'constraints' parameter for dynamic where clauses is not directly supported in this simplified version.
  // If you need dynamic filtering, you'll need to build the query conditionally.
  const { data, error } = await query;
  if (error) {
    console.error('getArticles error:', error);
    return [];
  }
  return data as Article[];
}

export async function getArticleById(id: string): Promise<Article | null> {
  const { data, error } = await supabase.from('articles').select('*').eq('id', id).single();
  if (error) return null;
  return data as Article;
}
