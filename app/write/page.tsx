"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { KeywordInput } from "@/components/keyword-input";
import { availableSites } from "@/lib/sites";
import { Checkbox } from "@/components/ui/checkbox";
import dynamic from 'next/dynamic';

const Editor = dynamic(() => import('@/components/editor'), { ssr: false });

export default function WritePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isTitleLoading, setIsTitleLoading] = useState(false);
  const [isKeywordsLoading, setIsKeywordsLoading] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [editableArticle, setEditableArticle] = useState("");
  const [error, setError] = useState("");
  const [topic, setTopic] = useState("");
  const [generatedTitles, setGeneratedTitles] = useState<string[]>([]);
  const [articleTitle, setArticleTitle] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [generatedImageUrl, setGeneratedImageUrl] = useState('');
  const [selectedSites, setSelectedSites] = useState<string[]>([]);

  const handleSiteSelection = (siteId: string) => {
    setSelectedSites(prev => 
      prev.includes(siteId) ? prev.filter(id => id !== siteId) : [...prev, siteId]
    );
  };

  const handleGenerateTitle = async () => {
    if (!topic) {
      setError("Please enter a topic to generate a title.");
      return;
    }
    setIsTitleLoading(true);
    setError("");
    setGeneratedTitles([]);
    try {
      const response = await fetch("/api/generate-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      if (!response.ok) throw new Error("Failed to generate titles.");
      const data = await response.json();
      setGeneratedTitles(data.titles);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsTitleLoading(false);
    }
  };

  const handleGenerateKeywords = async () => {
    if (!articleTitle) {
      setError("Please enter an article title to generate keywords.");
      return;
    }
    setIsKeywordsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/generate-keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: articleTitle }),
      });
      if (!response.ok) throw new Error("Failed to generate keywords.");
      const data = await response.json();
      setKeywords(prev => [...new Set([...prev, ...data.keywords])]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsKeywordsLoading(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!articleTitle) {
      setError("Please enter an article title to generate an image.");
      return;
    }
    setIsImageLoading(true);
    setError("");
    setGeneratedImageUrl('');
    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: articleTitle }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate image.");
      }
      setGeneratedImageUrl(data.imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsImageLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const imageFile = formData.get('image') as File;

    if (keywords.length === 0) {
        setError("Please add at least one keyword.");
        setIsLoading(false);
        return;
    }

    if (imageFile && imageFile.size > 0) {
        try {
            const imageFormData = new FormData();
            imageFormData.append('file', imageFile);
            await fetch('/api/upload', { method: 'POST', body: imageFormData });
        } catch (err) {
            console.error("Image upload failed:", err);
        }
    }

    const articleData = {
      keywords: keywords,
      domain: formData.get("domain"),
      length: formData.get("length"),
      tone: formData.get("tone"),
      customPrompt: formData.get("customPrompt"),
    };

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(articleData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate article");
      }

      const result = await response.json();
      setEditableArticle(result.article);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!articleTitle || !editableArticle) {
        setError("Prašome sugeneruoti straipsnį ir pavadinimą prieš publikuojant.");
        return;
    }
    if (selectedSites.length === 0) {
        setError("Pasirinkite bent vieną svetainę, kurioje norite publikuoti.");
        return;
    }
    setIsPublishing(true);
    setError("");

    // Find the image file from the form input
    const imageInput = document.getElementById('image') as HTMLInputElement;
    const imageFile = imageInput.files ? imageInput.files[0] : null;

    const formData = new FormData();
    formData.append('title', articleTitle);
    formData.append('content', editableArticle);
    selectedSites.forEach(siteId => {
        formData.append('siteIds', siteId);
    });
    if (imageFile) {
        formData.append('image', imageFile);
    }

    try {
        const response = await fetch('/api/publish', {
            method: 'POST',
            body: formData, // Send as multipart/form-data
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Publikavimas nepavyko.");
        }
        const { results }: { results: { site: string; success: boolean; error?: string }[] } = await response.json();
        console.log("Publishing results:", results);
        
        const successfulSites = results.filter(r => r.success).map(r => r.site);
        if (successfulSites.length > 0) {
            alert(`Straipsnis sėkmingai publikuotas svetainėse: ${successfulSites.join(', ')}`);
        }

        const failedSites = results.filter(r => !r.success);
        if (failedSites.length > 0) {
            const errorMessages = failedSites.map(r => `${r.site}: ${r.error}`).join('\n');
            setError(`Klaida publikuojant šiose svetainėse:\n${errorMessages}`);
        }

    } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred during publishing.");
    } finally {
        setIsPublishing(false);
    }
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Sukurkite Straipsnį su AI</CardTitle>
          <CardDescription>Užpildykite laukus, kad sugeneruotumėte unikalų straipsnį.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="topic">Straipsnio Tema</Label>
              <div className="flex items-center gap-2">
                <Input id="topic" name="topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Pvz., Dirbtinio intelekto ateitis" />
                <Button type="button" onClick={handleGenerateTitle} disabled={isTitleLoading} className="flex-shrink-0">
                  {isTitleLoading ? "Generuojama..." : "Generuoti Pavadinimą"}
                </Button>
              </div>
            </div>

            {generatedTitles.length > 0 && (
              <div className="space-y-2">
                <Label>Sugeneruoti pavadinimai (pasirinkite vieną)</Label>
                <div className="flex flex-col gap-2">
                  {generatedTitles.map((title, i) => (
                    <Button key={i} variant="outline" onClick={() => setArticleTitle(title)} className="justify-start text-left h-auto whitespace-normal">
                      {title}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="articleTitle">Straipsnio Pavadinimas</Label>
              <Input id="articleTitle" name="articleTitle" value={articleTitle} onChange={(e) => setArticleTitle(e.target.value)} placeholder="Pasirinkite arba įveskite pavadinimą" required />
            </div>

            <div className="space-y-2">
              <Label>Raktiniai Žodžiai</Label>
              <KeywordInput value={keywords} onChange={setKeywords} onGenerate={handleGenerateKeywords} isLoading={isKeywordsLoading} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="domain">Jūsų svetainės nuoroda</Label>
                <Input id="domain" name="domain" placeholder="Pvz., manoportalas.lt" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="length">Straipsnio Ilgis</Label>
                <Select name="length" defaultValue="400">
                  <SelectTrigger id="length"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="200">~200 žodžių (Trumpas)</SelectItem>
                    <SelectItem value="400">~400 žodžių (Vidutinis)</SelectItem>
                    <SelectItem value="800">~800 žodžių (Ilgas)</SelectItem>
                    <SelectItem value="1200">~1200 žodžių (Labai ilgas)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                  <Label htmlFor="tone">Straipsnio Tonas</Label>
                  <Select name="tone" defaultValue="Profesionalus">
                      <SelectTrigger id="tone"><SelectValue /></SelectTrigger>
                      <SelectContent>
                          <SelectItem value="Profesionalus">Profesionalus</SelectItem>
                          <SelectItem value="Laisvalaikio">Laisvalaikio</SelectItem>
                          <SelectItem value="Humoristinis">Humoristinis</SelectItem>
                          <SelectItem value="Techninis">Techninis</SelectItem>
                      </SelectContent>
                  </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customPrompt">Papildomi Nurodymai (nebūtina)</Label>
              <Textarea id="customPrompt" name="customPrompt" placeholder="Pvz., paminėkite naujausius AI trendus..." />
            </div>

            <div className="space-y-2">
                <Label htmlFor="image">Pagrindinis Paveikslėlis</Label>
                <div className="flex items-center gap-2">
                    <Input id="image" name="image" type="file" className="flex-grow" />
                    <Button type="button" onClick={handleGenerateImage} disabled={isImageLoading} className="flex-shrink-0">
                        {isImageLoading ? "Generuojama..." : "Generuoti Paveikslėlį"}
                    </Button>
                </div>
            </div>

            {generatedImageUrl && (
                <div className="space-y-2">
                    <Label>Sugeneruotas paveikslėlis</Label>
                    <div className="relative w-full max-w-sm h-64">
                        <Image src={generatedImageUrl} alt="Sugeneruotas AI" layout="fill" objectFit="contain" className="rounded-md border" />
                    </div>
                    <p className="text-sm text-gray-500">Norėdami panaudoti šį paveikslėlį, išsaugokite jį ir įkelkite viršuje.</p>
                </div>
            )}

            <Button type="submit" disabled={isLoading} size="lg">
              {isLoading ? "Generuojama..." : "Generuoti Straipsnį"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Card className="bg-red-50 border-red-200">
          <CardHeader><CardTitle className="text-red-700">Klaida</CardTitle></CardHeader>
          <CardContent><p className="text-red-600">{error}</p></CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Straipsnio Redaktorius</CardTitle>
        </CardHeader>
        <CardContent>
            <Editor
                onChange={(data) => setEditableArticle(data)}
                value={editableArticle}
            />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Publikuoti Straipsnį</CardTitle>
            <CardDescription>Pasirinkite svetaines, kuriose norite publikuoti šį straipsnį.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="space-y-2">
                {availableSites.map(site => (
                    <div key={site.id} className="flex items-center space-x-2">
                        <Checkbox 
                            id={site.id} 
                            onCheckedChange={() => handleSiteSelection(site.id)}
                            checked={selectedSites.includes(site.id)}
                        />
                        <label htmlFor={site.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            {site.name}
                        </label>
                    </div>
                ))}
            </div>
            <div className="flex justify-between items-center">
                <p className="text-lg font-semibold">Kaina: 100 EUR</p>
                <Button onClick={handlePublish} disabled={isPublishing || selectedSites.length === 0}>
                    {isPublishing ? "Publikuojama..." : "Publikuoti"}
                </Button>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
