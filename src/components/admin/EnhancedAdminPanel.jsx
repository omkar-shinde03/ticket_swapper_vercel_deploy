import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Users,
  Ticket,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  BarChart3
} from 'lucide-react';

export const EnhancedAdminPanel = () => {
  const [analytics, setAnalytics] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [supportTickets, setSupportTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [analyticsData, ticketsData, usersData, transactionsData, supportData] = await Promise.all([
        supabase.from('platform_analytics').select('*').order('date', { ascending: false }).limit(1),
        supabase.from('tickets').select('*, user_profiles!seller_id(*)').order('created_at', { ascending: false }).limit(20),
        supabase.from('user_profiles').select('*').order('created_at', { ascending: false }).limit(20),
        supabase.from('enhanced_transactions').select('*, tickets(*), buyer:buyer_id(*), seller:seller_id(*)').order('created_at', { ascending: false }).limit(20),
        supabase.from('support_tickets').select('*, user_profiles(*)').order('created_at', { ascending: false }).limit(20)
      ]);

      setAnalytics(analyticsData.data?.[0]);
      setTickets(ticketsData.data || []);
      setUsers(usersData.data || []);
      setTransactions(transactionsData.data || []);
      setSupportTickets(supportData.data || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTicketStatus = async (ticketId, status, verification_status) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ status, verification_status })
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: 'Ticket Updated',
        description: 'Ticket status has been updated successfully.',
      });

      loadDashboardData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update ticket status.',
        variant: 'destructive',
      });
    }
  };

  const updateUserKYC = async (userId, kycStatus) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ kyc_status: kycStatus })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: 'KYC Updated',
        description: 'User KYC status has been updated successfully.',
      });

      loadDashboardData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update KYC status.',
        variant: 'destructive',
      });
    }
  };

  const StatsCard = ({ title, value, icon: Icon, trend, color = 'blue' }) => (
    <Card>
      <CardContent className="flex items-center p-6">
        <div className={`p-2 rounded-lg bg-${color}-100 mr-4`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {trend && (
            <p className="text-xs text-gray-500 mt-1">
              <span className={trend > 0 ? 'text-green-600' : 'text-red-600'}>
                {trend > 0 ? '+' : ''}{trend}%
              </span> from last month
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Users"
          value={analytics?.total_users || 0}
          icon={Users}
          color="blue"
        />
        <StatsCard
          title="Active Tickets"
          value={analytics?.total_tickets || 0}
          icon={Ticket}
          color="green"
        />
        <StatsCard
          title="Total Revenue"
          value={`₹${analytics?.total_revenue || 0}`}
          icon={DollarSign}
          color="yellow"
        />
        <StatsCard
          title="Platform Fees"
          value={`₹${analytics?.platform_fees || 0}`}
          icon={TrendingUp}
          color="purple"
        />
      </div>

      {/* Management Tabs */}
      <Tabs defaultValue="tickets" className="space-y-6">
        <TabsList>
          <TabsTrigger value="tickets">Ticket Management</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="support">Support Tickets</TabsTrigger>
        </TabsList>

        <TabsContent value="tickets">
          <Card>
            <CardHeader>
              <CardTitle>Recent Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tickets.map((ticket) => (
                  <div key={ticket.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium">{ticket.from_location} → {ticket.to_location}</h3>
                        <Badge variant={ticket.status === 'available' ? 'default' : 'secondary'}>
                          {ticket.status}
                        </Badge>
                        <Badge variant={ticket.status === 'available' ? 'default' : 'secondary'}>
                          {ticket.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        PNR: {ticket.pnr_number} • ₹{ticket.selling_price}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateTicketStatus(ticket.id, 'available', 'verified')}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateTicketStatus(ticket.id, 'rejected', 'rejected')}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium">{user.full_name || 'Unnamed User'}</h3>
                        <Badge variant={user.kyc_status === 'verified' ? 'default' : 'secondary'}>
                          KYC: {user.kyc_status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        Rating: {user.rating?.toFixed(1) || '0.0'} • 
                        {user.total_transactions || 0} transactions
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateUserKYC(user.user_id, 'verified')}
                        disabled={user.kyc_status === 'verified'}
                      >
                        Verify KYC
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateUserKYC(user.user_id, 'rejected')}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium">₹{transaction.amount}</h3>
                        <Badge variant={transaction.status === 'completed' ? 'default' : 'secondary'}>
                          {transaction.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        Platform Fee: ₹{transaction.platform_fee} • 
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="support">
          <Card>
            <CardHeader>
              <CardTitle>Support Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {supportTickets.map((ticket) => (
                  <div key={ticket.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium">{ticket.subject}</h3>
                        <Badge variant={ticket.status === 'open' ? 'destructive' : 'default'}>
                          {ticket.status}
                        </Badge>
                        <Badge variant="outline">
                          {ticket.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        {ticket.description?.substring(0, 100)}...
                      </p>
                    </div>
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};