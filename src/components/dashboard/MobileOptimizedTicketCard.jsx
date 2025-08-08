
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Clock, IndianRupee, User, Bus, Loader2, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

/**
 * @typedef {Object} MobileOptimizedTicketCardProps
 * @property {any} ticket
 * @property {(ticket: any, action: string) => void} [onAction]
 * @property {boolean} [showActions]
 * @property {boolean} [isProcessing]
 */

export const MobileOptimizedTicketCard = ({ 
  ticket, 
  onAction, 
  showActions = true,
  isProcessing = false
}) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'sold': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="w-full transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold truncate">
              PNR: {ticket.pnr_number}
            </CardTitle>
            <div className="flex items-center text-sm text-gray-600 mt-1">
              <Bus className="h-4 w-4 mr-1 flex-shrink-0" />
              <span className="truncate">{ticket.bus_operator}</span>
            </div>
          </div>
          <Badge className={getStatusColor(ticket.status)}>
            {ticket.status}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Route Information */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <MapPin className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {ticket.from_location}
              </div>
              <div className="text-xs text-gray-500">From</div>
            </div>
          </div>
          <div className="px-2 text-gray-400">→</div>
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <MapPin className="h-4 w-4 text-red-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {ticket.to_location}
              </div>
              <div className="text-xs text-gray-500">To</div>
            </div>
          </div>
        </div>

        {/* Journey Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <div>
              <div className="font-medium">{ticket.departure_date}</div>
              <div className="text-xs text-gray-500">Date</div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <div>
              <div className="font-medium">{ticket.departure_time}</div>
              <div className="text-xs text-gray-500">Time</div>
            </div>
          </div>
        </div>

        {/* Passenger & Seat */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">{ticket.passenger_name}</div>
              <div className="text-xs text-gray-500">Passenger</div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-600 rounded flex-shrink-0 flex items-center justify-center">
              <span className="text-white text-xs font-bold">S</span>
            </div>
            <div>
              <div className="font-medium">{ticket.seat_number}</div>
              <div className="text-xs text-gray-500">Seat</div>
            </div>
          </div>
        </div>

        {/* Price Information */}
        <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center space-x-2">
            <IndianRupee className="h-5 w-5 text-green-600" />
            <div>
              <div className="text-lg font-bold text-green-600">
                ₹{ticket.selling_price || ticket.ticket_price}
              </div>
              {ticket.selling_price && ticket.ticket_price !== ticket.selling_price && (
                <div className="text-xs text-gray-500 line-through">
                  ₹{ticket.ticket_price}
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">
              Listed {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {showActions && onAction && (
          <div className="flex gap-2 pt-2">
            {ticket.status === 'available' && (
              <>
                <Button 
                  size="sm" 
                  className="flex-1"
                  onClick={() => onAction(ticket, 'buy')}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Buy Now"
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onAction(ticket, 'message')}
                  disabled={isProcessing}
                >
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Message
                </Button>
              </>
            )}
            {ticket.status === 'pending' && (
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={() => onAction(ticket, 'view')}
              >
                View Details
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
