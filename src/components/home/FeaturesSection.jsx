
import { Shield, CheckCircle, Clock } from "lucide-react";

export const FeaturesSection = () => {
  return (
    <section id="features" className="py-16 px-4 sm:px-6 lg:px-8 animate-fade-in-up">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">Why Choose TicketSwapper?</h2>
          <p className="text-muted-foreground">Built for Indian travelers, by Indian travelers</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center group animate-scale-in delay-100">
            <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center mx-auto mb-4 transition-all duration-300 group-hover:shadow-lg group-hover:scale-110">
              <Shield className="h-6 w-6 text-foreground" />
            </div>
            <h3 className="font-semibold mb-2 text-foreground">100% Verified</h3>
            <p className="text-sm text-muted-foreground">PNR validation ensures authentic tickets only</p>
          </div>
          <div className="text-center group animate-scale-in delay-200">
            <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center mx-auto mb-4 transition-all duration-300 group-hover:shadow-lg group-hover:scale-110">
              <CheckCircle className="h-6 w-6 text-foreground" />
            </div>
            <h3 className="font-semibold mb-2 text-foreground">KYC Verified Users</h3>
            <p className="text-sm text-muted-foreground">Aadhaar-based verification for trusted trading</p>
          </div>
          <div className="text-center group animate-scale-in delay-300">
            <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center mx-auto mb-4 transition-all duration-300 group-hover:shadow-lg group-hover:scale-110">
              <Clock className="h-6 w-6 text-foreground" />
            </div>
            <h3 className="font-semibold mb-2 text-foreground">Instant Transfer</h3>
            <p className="text-sm text-muted-foreground">Quick ticket transfer for urgent needs</p>
          </div>
        </div>
      </div>
    </section>
  );
};
