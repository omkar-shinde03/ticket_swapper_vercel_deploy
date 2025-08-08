import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import TicketCard from "../dashboard/TicketCard";
import { EmptyState } from "../dashboard/EmptyStates";
import { TicketGridSkeleton } from "../dashboard/LoadingStates";
import { ShoppingCart, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const AvailableTicketsSection = ({ tickets, isLoading, searchResults = null }) => {
  const navigate = useNavigate();
  
  const displayTickets = searchResults || tickets;
  const isSearchMode = searchResults !== null;

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8 animate-fade-in-up">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            {isSearchMode ? 'Search Results' : 'Available Tickets'}
          </h2>
          <p className="text-muted-foreground">
            {isSearchMode 
              ? `Found ${displayTickets.length} tickets matching your search`
              : 'Browse and purchase verified bus tickets from other users'
            }
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShoppingCart className="h-5 w-5" />
                <span>
                  {isSearchMode ? 'Search Results' : 'Latest Available Tickets'} 
                  ({displayTickets.length})
                </span>
              </div>
              {!isSearchMode && tickets.length > 0 && (
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center space-x-2"
                >
                  <span>View All</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </CardTitle>
            <CardDescription>
              {isSearchMode 
                ? 'Tickets matching your search criteria'
                : 'Latest tickets available for purchase'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TicketGridSkeleton />
            ) : displayTickets.length === 0 ? (
              <EmptyState
                type={isSearchMode ? "search" : "tickets"}
                title={isSearchMode ? "No tickets found" : "No available tickets"}
                description={
                  isSearchMode 
                    ? "No tickets match your search criteria. Try adjusting your filters."
                    : "Check back later for new ticket listings."
                }
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {displayTickets.map((ticket) => (
                  <div key={ticket.id} className="relative">
                    <TicketCard
                      ticket={ticket}
                      isOwner={false}
                      onBuyClick={() => {
                        // Redirect to auth page for non-logged users
                        window.location.href = '/auth';
                      }}
                    />
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Available
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {!isSearchMode && displayTickets.length > 0 && (
              <div className="mt-6 text-center">
                <Button 
                  onClick={() => navigate('/auth')}
                  variant="default"
                  size="lg"
                >
                  Sign Up to Purchase Tickets
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
};