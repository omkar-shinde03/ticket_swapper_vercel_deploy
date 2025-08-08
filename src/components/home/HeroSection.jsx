
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export const HeroSection = () => {
  return (
    <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden animate-fade-in-up">
      {/* Enhanced background decorations */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent-blue/5 to-accent-green/5"></div>
      <div className="absolute top-20 left-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-40 h-40 bg-accent-blue/10 rounded-full blur-2xl animate-pulse delay-1000"></div>
      <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-accent-green/10 rounded-full blur-xl animate-pulse delay-500"></div>
      
      <div className="max-w-7xl mx-auto relative">
        <div className="text-center">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight animate-fade-in-up">
              Rescue Your
              <span className="glass-gradient-text"> Last-Minute </span>
              Bus Tickets
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-4xl mx-auto leading-relaxed animate-fade-in-up delay-200">
              Securely buy and sell bus tickets in emergencies. Our platform connects travelers 
              with verified tickets, ensuring safe and authentic transactions across India.
            </p>
          
          <div className="flex justify-center animate-fade-in-up delay-300">
            <Link to="/auth">
              <Button variant="default" size="lg" className="px-8">
                Start Trading Tickets
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
