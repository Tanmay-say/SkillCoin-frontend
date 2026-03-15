"use client";

import { useState, useCallback, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SkillCard from "@/components/SkillCard";
import SearchBar from "@/components/SearchBar";
import CategoryFilter from "@/components/CategoryFilter";
import { fetchSkills, searchSkills, type Skill } from "@/lib/api";
import { Loader2, Box, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function ExplorePage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [totalCount, setTotalCount] = useState(0);

  // Load skills from API
  const loadSkills = useCallback(async () => {
    setLoading(true);
    try {
      if (searchQuery) {
        // MED-BUG-02 FIX: Pass category to server for filtering (not client-side)
        const result = await searchSkills(searchQuery, 1, selectedCategory);
        setSkills(result.skills);
        setTotalCount(result.pagination.total);
      } else {
        const params: Record<string, any> = { limit: 50 };
        if (selectedCategory !== "all") {
          params.category = selectedCategory;
        }
        const result = await fetchSkills(params);
        setSkills(result.skills);
        setTotalCount(result.pagination.total);
      }
    } catch (err) {
      console.error("Failed to fetch skills:", err);
      setSkills([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory]);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  return (
    <main className="min-h-screen">
      <Navbar />

      <section className="pt-28 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-10">
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              Explore Skills
            </h1>
            <p className="text-text-secondary text-lg">
              Discover AI agent skills stored permanently on Filecoin.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <SearchBar onSearch={handleSearch} />
            <div className="w-full sm:w-auto">
              <CategoryFilter
                selected={selectedCategory}
                onSelect={setSelectedCategory}
              />
            </div>
          </div>

          {/* Results info */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-text-muted">
              {loading ? "Loading..." : `${totalCount} skill${totalCount !== 1 ? "s" : ""} found`}
              {searchQuery && (
                <span>
                  {" "}for &quot;<span className="text-white">{searchQuery}</span>&quot;
                </span>
              )}
            </p>
          </div>

          {/* Skills Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-brand-purple animate-spin" />
            </div>
          ) : skills.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {skills.map((skill) => (
                <SkillCard key={skill.id} skill={skill} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mx-auto mb-4">
                <Box className="w-8 h-8 text-brand-purple" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery ? "No skills found" : "No skills published yet"}
              </h3>
              <p className="text-sm text-text-secondary mb-6">
                {searchQuery
                  ? "Try adjusting your search or filter."
                  : "Be the first to publish an AI skill on Skillcoin!"}
              </p>
              {!searchQuery && (
                <Link href="/create" className="btn-primary inline-flex items-center gap-2">
                  Publish a Skill <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
