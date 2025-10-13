import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase-client';
import type { Database } from '@website-scraper/shared';

type Job = Database['public']['Tables']['jobs']['Row'];

type JobCallback = (payload: { new: Job; old: Job | null; eventType: 'INSERT' | 'UPDATE' | 'DELETE' }) => void;

const activeChannels: RealtimeChannel[] = [];

/**
 * Subscribe to changes on the jobs table
 */
export function subscribeToJobList(callback: JobCallback): RealtimeChannel {
  console.log('[Realtime] Subscribing to jobs table');

  const channel = supabase
    .channel('jobs-list-channel')
    .on<Job>(
      'postgres_changes',
      {
        event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
        schema: 'public',
        table: 'jobs',
      },
      (payload) => {
        console.log('[Realtime] Jobs table change:', payload.eventType);
        callback({
          new: payload.new as Job,
          old: payload.old as Job | null,
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
        });
      }
    )
    .subscribe((status) => {
      console.log('[Realtime] Jobs list subscription status:', status);
    });

  activeChannels.push(channel);
  return channel;
}

/**
 * Subscribe to a specific job
 */
export function subscribeToJob(jobId: string, callback: JobCallback): RealtimeChannel {
  console.log(`[Realtime] Subscribing to job ${jobId}`);

  const channel = supabase
    .channel(`job-${jobId}-channel`)
    .on<Job>(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'jobs',
        filter: `id=eq.${jobId}`,
      },
      (payload) => {
        console.log(`[Realtime] Job ${jobId} updated`);
        callback({
          new: payload.new as Job,
          old: payload.old as Job | null,
          eventType: 'UPDATE',
        });
      }
    )
    .subscribe((status) => {
      console.log(`[Realtime] Job ${jobId} subscription status:`, status);
    });

  activeChannels.push(channel);
  return channel;
}

/**
 * Unsubscribe from a specific channel
 */
export async function unsubscribe(channel: RealtimeChannel): Promise<void> {
  console.log('[Realtime] Unsubscribing from channel');
  await supabase.removeChannel(channel);

  const index = activeChannels.indexOf(channel);
  if (index > -1) {
    activeChannels.splice(index, 1);
  }
}

/**
 * Unsubscribe from all channels
 */
export async function unsubscribeAll(): Promise<void> {
  console.log(`[Realtime] Unsubscribing from ${activeChannels.length} channels`);

  for (const channel of activeChannels) {
    await supabase.removeChannel(channel);
  }

  activeChannels.length = 0;
}

/**
 * Get count of active channels
 */
export function getActiveChannelCount(): number {
  return activeChannels.length;
}
