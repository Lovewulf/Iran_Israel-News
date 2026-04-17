import { supabase } from '../lib/supabaseClient';
import type { Source, AIReport, EventCluster, Article } from '../types';

// ============ Sources ============
export async function getSources(): Promise<Source[]> {
  const { data, error } = await supabase.from('sources').select('*').order('name');
  if (error) {
    console.error('getSources error:', error);
    throw error;
  }
  return data as Source[];
}

export async function addSource(source: Omit<Source, 'id'>): Promise<string> {
  const { data, error } = await supabase.from('sources').insert(source).select();
  if (error) {
    console.error('addSource error:', error);
    throw error;
  }
  return data[0].id;
}

export async function updateSource(id: string, updates: Partial<Source>): Promise<void> {
  const { error } = await supabase.from('sources').update(updates).eq('id', id);
  if (error) {
    console.error('updateSource error:', error);
    throw error;
  }
}

export async function deleteSource(id: string): Promise<void> {
  const { error } = await supabase.from('sources').delete().eq('id', id);
  if (error) {
    console.error('deleteSource error:', error);
    throw error;
  }
}

export async function testSourceConnection(sourceId: string): Promise<{ success: boolean; message: string }> {
  try {
    const { data, error } = await supabase.from('sources').select('url').eq('id', sourceId).single();
    if (error) throw error;
    if (data?.url) return { success: true, message: 'Connection successful' };
    return { success: false, message: 'No URL configured' };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Connection failed' };
  }
}

// ============ AI Reports ============
export async function getAIReports(limitCount = 20): Promise<AIReport[]> {
  const { data, error } = await supabase
    .from('ai_reports')
    .select('*')
    .order('generated_at', { ascending: false })
    .limit(limitCount);
  if (error) {
    console.error('getAIReports error:', error);
    throw error;
  }
  return data as AIReport[];
}

export async function saveReport(report: Partial<AIReport>): Promise<string> {
  const { data, error } = await supabase.from('ai_reports').insert(report).select();
  if (error) {
    console.error('saveReport error:', error);
    throw error;
  }
  return data[0].id;
}

/**
 * Deletes all AI report records from the database.
 * Uses the service role key to bypass RLS for this admin action.
 */
export async function deleteAllReports(): Promise<void> {
  const { error } = await supabase
    .from('ai_reports')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows
  if (error) throw error;
}

// ============ Event Clusters ============
export async function getEventClusters(status?: 'active' | 'archived'): Promise<EventCluster[]> {
  let query = supabase.from('event_clusters').select('*');
  if (status) query = query.eq('status', status);
  const { data, error } = await query.order('start_time', { ascending: false });
  if (error) {
    console.error('getEventClusters error:', error);
    throw error;
  }
  return data as EventCluster[];
}

export async function getEventClusterById(id: string): Promise<EventCluster | null> {
  const { data, error } = await supabase.from('event_clusters').select('*').eq('id', id).single();
  if (error) {
    if (error.code !== 'PGRST116') console.error('getEventClusterById error:', error);
    return null;
  }
  return data as EventCluster;
}

// ============ Additional Helper Functions ============
export async function getArticlesByCluster(clusterId: string): Promise<Article[]> {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('cluster_id', clusterId)
    .order('published_at', { ascending: false });
  if (error) {
    console.error('getArticlesByCluster error:', error);
    return [];
  }
  return data as Article[];
}

export async function getArticles(limitCount = 100): Promise<Article[]> {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .order('published_at', { ascending: false })
    .limit(limitCount);
  if (error) {
    console.error('getArticles error:', error);
    return [];
  }
  return data as Article[];
}
