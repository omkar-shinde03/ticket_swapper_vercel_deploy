
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TicketIcon, CheckCircle, AlertCircle } from "lucide-react";

/**
 * @typedef {Object} Profile
 * @property {string} id
 * @property {string|null} full_name
 * @property {string|null} phone
 * @property {string} user_type
 * @property {string} kyc_status
 * @property {string} created_at
 */

/**
 * @typedef {Object} Ticket
 * @property {string} id
 * @property {string} status
 
 */

/**
 * @typedef {Object} AdminStatsProps
 * @property {Profile[]} users
 * @property {Ticket[]} tickets
 */

export const AdminStats = ({ users, tickets }) => {
  const totalUsers = users.length;
  const verifiedUsers = users.filter(user => user.kyc_status === 'verified').length;
  const pendingKYC = users.filter(user => user.kyc_status === 'pending').length;
  const totalTickets = tickets.length;
  const activeTickets = tickets.filter(ticket => ticket.status === 'available').length;
  const soldTickets = tickets.filter(ticket => ticket.status === 'sold').length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalUsers}</div>
          <p className="text-xs text-muted-foreground">
            {verifiedUsers} verified, {pendingKYC} pending KYC
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
          <TicketIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalTickets}</div>
          <p className="text-xs text-muted-foreground">
            {activeTickets} active, {soldTickets} sold
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">KYC Verified</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{verifiedUsers}</div>
          <p className="text-xs text-muted-foreground">
            {((verifiedUsers / totalUsers) * 100).toFixed(1)}% of users
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending KYC</CardTitle>
          <AlertCircle className="h-4 w-4 text-yellow-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{pendingKYC}</div>
          <p className="text-xs text-muted-foreground">
            Listed for sale
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
