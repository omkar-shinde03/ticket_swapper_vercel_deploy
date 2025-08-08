
import React, { useState } from "react";
import { Header } from "@/components/home/Header";
import { HeroSection } from "@/components/home/HeroSection";
import { QuickSearchSection } from "@/components/home/QuickSearchSection";
import { AvailableTicketsSection } from "@/components/home/AvailableTicketsSection";
import { FeaturesSection } from "@/components/home/FeaturesSection";
import { Footer } from "@/components/home/Footer";
import { useHomeData } from "@/hooks/useHomeData";

const Index = () => {
  const [searchResults, setSearchResults] = useState(null);
  const { availableTickets, isLoading, searchTickets } = useHomeData();

  const handleSearch = async (searchData) => {
    console.log("Search data:", searchData);
    const results = await searchTickets(searchData);
    setSearchResults(results);
    return results;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <HeroSection />
      <QuickSearchSection onSearch={handleSearch} />
      <AvailableTicketsSection 
        tickets={availableTickets} 
        isLoading={isLoading}
        searchResults={searchResults}
      />
      <FeaturesSection />
      <Footer />
    </div>
  );
};

export default Index;
