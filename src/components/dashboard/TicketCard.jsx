import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, Clock, MapPin, User, ArrowRight, Shield, ShieldCheck, ShieldX } from "lucide-react";
import { format } from "date-fns";
import { QuickPurchaseButton } from "@/components/purchase/QuickPurchaseButton";

const TicketCard = ({ ticket, onBuyClick, isOwner = false }) => {
  const getStatusBadge = (status) => {
    const statusConfig = {
      available: { label: "Available", variant: "default" },
      sold: { label: "Sold", variant: "secondary" },
      cancelled: { label: "Cancelled", variant: "destructive" }
    };
    
    const config = statusConfig[status] || statusConfig.available;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getVerificationBadge = (ticket) => {
    // Check for API verification first (highest priority)
    if (ticket.api_verified && ticket.verification_status === 'verified') {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200 flex items-center gap-1">
          <ShieldCheck className="h-3 w-3" />
          API Verified
        </Badge>
      );
    }
    
    // Regular verification
    if (ticket.verification_status === 'verified') {
      return (
        <Badge variant="default" className="flex items-center gap-1">
          <Shield className="h-3 w-3" />
          Verified
        </Badge>
      );
    }
    
    // Pending or other status
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <Shield className="h-3 w-3" />
        Pending
      </Badge>
    );
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-semibold">
              {ticket.bus_operator}
            </CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1">
              <User className="h-3 w-3" />
              {ticket.passenger_name}
            </CardDescription>
            {/* Show seller info if available (from database function) */}
            {ticket.seller_name && !isOwner && (
              <CardDescription className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                Seller: {ticket.seller_name}
                {ticket.seller_kyc_status === 'verified' && (
                  <Badge variant="outline" className="text-xs">Verified</Badge>
                )}
              </CardDescription>
            )}
          </div>
          <div className="flex gap-2">
            {getStatusBadge(ticket.status)}
            {getVerificationBadge(ticket)}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{ticket.from_location || ticket.from}</span>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <span className="font-medium">{ticket.to_location || ticket.to}</span>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Seat</div>
            <div className="font-semibold">{ticket.seat_number}</div>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <CalendarIcon className="h-4 w-4" />
              {ticket.departure_date ? format(new Date(ticket.departure_date), "MMM dd, yyyy") : "N/A"}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {ticket.departure_time}
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-2 border-t">
          <div className="flex items-center gap-4">
            <div>
              <div className="text-xs text-muted-foreground">Original Price</div>
              <div className="text-sm line-through text-muted-foreground">
                ₹{ticket.ticket_price || ticket.price}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Selling Price</div>
              <div className="text-lg font-bold text-green-600">
                ₹{ticket.selling_price || ticket.price}
              </div>
            </div>
            {(ticket.ticket_price || ticket.price) > (ticket.selling_price || ticket.price) && (
              <Badge variant="secondary" className="text-xs">
                Save ₹{((ticket.ticket_price || ticket.price) - (ticket.selling_price || ticket.price)).toFixed(2)}
              </Badge>
            )}
          </div>
          
          {!isOwner && ticket.status === 'available' && (
            <QuickPurchaseButton 
              ticket={ticket}
              onPurchaseSuccess={onBuyClick}
            />
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          PNR: {ticket.pnr_number || ticket.pnr} • Listed {(ticket.created_at || ticket.updated_at) ? format(new Date(ticket.created_at || ticket.updated_at), "MMM dd") : "Recently"}
        </div>
      </CardContent>
    </Card>
  );
};

export default TicketCard;