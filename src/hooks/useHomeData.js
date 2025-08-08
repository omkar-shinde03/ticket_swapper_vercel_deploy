import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useHomeData = () => {
  const [availableTickets, setAvailableTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAvailableTickets = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Get current user to exclude their tickets
      const { data: { user } } = await supabase.auth.getUser();
      
      // Fetch only verified tickets from local database, excluding current user's tickets
      let query = supabase
        .from('tickets')
        .select('*')
        .eq('status', 'available')
        .eq('verification_status', 'verified')
        .order('created_at', { ascending: false });
      
      // Exclude current user's tickets if user is logged in
      if (user) {
        query = query.neq('seller_id', user.id);
      }

      const { data: ticketData, error } = await query;

      if (error) {
        console.error("Error loading verified tickets:", error);
        setAvailableTickets([]);
      } else {
        setAvailableTickets(ticketData || []);
      }
    } catch (err) {
      console.error('Error loading tickets:', err);
      setError('Failed to load tickets');
      setAvailableTickets([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAvailableTickets();
    
    // Refresh tickets every 30 seconds
    const interval = setInterval(loadAvailableTickets, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const searchTickets = async (filters) => {
    try {
      // Get current user to exclude their tickets
      const { data: { user } } = await supabase.auth.getUser();
      
      // Fetch only verified tickets from local database, excluding current user's tickets
      let query = supabase
        .from('tickets')
        .select('*')
        .eq('status', 'available')
        .eq('verification_status', 'verified');
      
      // Exclude current user's tickets if user is logged in
      if (user) {
        query = query.neq('seller_id', user.id);
      }

      const { data: allTickets, error } = await query;
      
      if (error) {
        console.error("Error searching tickets:", error);
        return [];
      }

      // Filter the tickets client-side
      let filteredTickets = allTickets || [];
      
      if (filters.fromLocation) {
        filteredTickets = filteredTickets.filter(ticket => 
          ticket.from_location?.toLowerCase().includes(filters.fromLocation.toLowerCase())
        );
      }

      if (filters.toLocation) {
        filteredTickets = filteredTickets.filter(ticket => 
          ticket.to_location?.toLowerCase().includes(filters.toLocation.toLowerCase())
        );
      }

      if (filters.date) {
        filteredTickets = filteredTickets.filter(ticket => 
          new Date(ticket.departure_date) >= new Date(filters.date)
        );
      }

      return filteredTickets;
    } catch (error) {
      console.error("Error searching tickets:", error);
      return [];
    }
  };

  return {
    availableTickets,
    isLoading,
    error,
    searchTickets,
    refetch: loadAvailableTickets
  };
};
