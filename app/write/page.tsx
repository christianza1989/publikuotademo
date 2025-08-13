"use client";

import { useState, useEffect } from "react";
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
import { ModelSelector, models } from "@/components/model-selector";
import dynamic from 'next/dynamic';
import { CheckCircle, Lightbulb } from "lucide-react";

const Editor = dynamic(() => import('@/components/editor'), { ssr: false });

interface Heading {
    title: string;
    context: string;
}

interface SeoAnalysis {
    seoScore: number;
    goodPoints: string[];
    suggestions: string[];
}

interface ArticleData {
  keywords: string[];
  domain: string | null;
  length: string | null;
  tone: string | null;
  structure: string | null;
  customPrompt: string | null;
  maintainStyle: boolean;
  originalText: string;
  model: string;
  image?: string;
}

export default function WritePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isTitleLoading, setIsTitleLoading] = useState(false);
  const [isKeywordsLoading, setIsKeywordsLoading] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isProofreading, setIsProofreading] = useState(false);
  const [isFaqLoading, setIsFaqLoading] = useState(false);
  const [isMetaLoading, setIsMetaLoading] = useState(false);
  const [isSeoLoading, setIsSeoLoading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [seoAnalysis, setSeoAnalysis] = useState<SeoAnalysis | null>(null);
  const [seoApplied, setSeoApplied] = useState(false);
  const [isBatchImageLoading, setIsBatchImageLoading] = useState(false);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [editableArticle, setEditableArticle] = useState("");
  const [error, setError] = useState("");
  const [topic, setTopic] = useState("");
  const [generatedTitles, setGeneratedTitles] = useState<string[]>([]);
  const [articleTitle, setArticleTitle] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [generatedImageUrl, setGeneratedImageUrl] = useState('');
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [maintainStyle, setMaintainStyle] = useState(false);
  const [originalText, setOriginalText] = useState('');
  const [selectedModel, setSelectedModel] = useState(models[0].id);
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [selectedHeadings, setSelectedHeadings] = useState<string[]>([]);

  useEffect(() => {
    handleRefreshHeadings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editableArticle]);


  const handleRefreshHeadings = () => {
    if (typeof window !== 'undefined' && editableArticle) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(editableArticle, 'text/html');
        const foundHeadings: Heading[] = [];
        const h2s = doc.querySelectorAll('h2');
        
        h2s.forEach((h2) => {
            let content = '';
            let nextElement = h2.nextElementSibling;
            while (nextElement && nextElement.tagName !== 'H2') {
                content += nextElement.outerHTML;
                nextElement = nextElement.nextElementSibling;
            }
            foundHeadings.push({ title: h2.innerText, context: h2.innerText + ' ' + content });
        });
        setHeadings(foundHeadings);
    } else {
        setHeadings([]);
    }
  };

  const handleHeadingSelection = (title: string) => {
    setSelectedHeadings(prev => 
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  };

  const handleGenerateHeadingImages = async () => {
    if (selectedHeadings.length === 0) {
        setError("Pasirinkite bent vieną antraštę.");
        return;
    }
    setIsBatchImageLoading(true);
    setError("");
    try {
        const requestsPayload = headings
            .filter(h => selectedHeadings.includes(h.title))
            .map(h => ({ heading: h.title, context: h.context }));
        const response = await fetch('/api/generate-batch-images', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requests: requestsPayload, model: selectedModel }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || "Failed to generate heading images.");
        }
        
        let updatedArticle = editableArticle;
        data.results.forEach((result: { heading: string; imageUrl?: string; success: boolean }) => {
            if (result.success && result.imageUrl) {
                // Use a regular expression to find the <h2> tag and insert the image figure after it.
                // This is more robust than simple string replacement or complex DOM manipulation for this case.
                const headingRegex = new RegExp(`(<h2(?:>|\\s[^>]*>))(${result.heading})(<\\/h2>)`);
                const imageTag = `<figure class="image"><img src="${result.imageUrl}" alt="${result.heading}"></figure>`;
                updatedArticle = updatedArticle.replace(headingRegex, `$1$2$3${imageTag}`);
            }
        });

        setEditableArticle(updatedArticle);
        setSelectedHeadings([]);

    } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
        setIsBatchImageLoading(false);
    }
  };

  const handleSiteSelection = (siteId: string) => {
    setSelectedSites(prev => 
      prev.includes(siteId) ? prev.filter(id => id !== siteId) : [...prev, siteId]
    );
  };

  const handleDocumentAnalysis = async () => {
    if (!documentFile) {
        setError("Prašome pasirinkti dokumento failą.");
        return;
    }
    setIsAnalyzing(true);
    setError("");
    try {
        const formData = new FormData();
        formData.append('file', documentFile);
        formData.append('model', selectedModel);
        const response = await fetch('/api/analyze-document', {
            method: 'POST',
            body: formData,
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || "Failed to analyze document.");
        }
        setTopic(data.topic || '');
        setGeneratedTitles(data.titles || []);
        setKeywords(data.keywords || []);
        setOriginalText(data.originalText || '');
        if (data.titles && data.titles.length > 0) {
            setArticleTitle(data.titles[0]);
        }
    } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
        setIsAnalyzing(false);
    }
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
        body: JSON.stringify({ topic, model: selectedModel }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to generate titles.");
      }
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
        body: JSON.stringify({ title: articleTitle, topic, model: selectedModel }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to generate keywords.");
      }
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
        body: JSON.stringify({ 
            prompt: articleTitle, 
            keywords: keywords,
            metaDescription: metaDescription,
            model: selectedModel 
        }),
      });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || "Failed to generate image.");
        }
        // Assuming the response contains a URL to the generated image.
        // This will likely need adjustment based on the actual API response.
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

    const articleData: ArticleData = {
      keywords: keywords,
      domain: formData.get("domain") as string | null,
      length: formData.get("length") as string | null,
      tone: formData.get("tone") as string | null,
      structure: formData.get("structure") as string | null,
      customPrompt: formData.get("customPrompt") as string | null,
      maintainStyle: maintainStyle,
      originalText: originalText,
      model: selectedModel,
    };

    if (documentFile && (documentFile.type === 'image/png' || documentFile.type === 'image/jpeg')) {
        const reader = new FileReader();
        reader.readAsDataURL(documentFile);
        reader.onload = async () => {
            articleData.image = reader.result as string;
            generateArticle(articleData);
        };
    } else {
        generateArticle(articleData);
    }
  };

  const generateArticle = async (articleData: ArticleData) => {
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
      setSeoApplied(false); // Reset SEO status for new article
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
    const imageInput = document.getElementById('image') as HTMLInputElement;
    const imageFile = imageInput.files ? imageInput.files[0] : null;
    const formData = new FormData();
    formData.append('title', articleTitle);
    formData.append('content', editableArticle);
    formData.append('metaTitle', metaTitle);
    formData.append('metaDescription', metaDescription);
    selectedSites.forEach(siteId => formData.append('siteIds', siteId));
    if (imageFile) {
        formData.append('image', imageFile);
    }
    try {
        const response = await fetch('/api/publish', {
            method: 'POST',
            body: formData,
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Publikavimas nepavyko.");
        }
        const { results }: { results: { site: string; success: boolean; error?: string }[] } = await response.json();
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

  const handleProofread = async () => {
    if (!editableArticle) {
        setError("Nėra teksto, kurį būtų galima taisyti.");
        return;
    }
    setIsProofreading(true);
    setError("");
    try {
        const response = await fetch('/api/proofread', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: editableArticle, model: selectedModel }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to proofread text.");
        }
        const data = await response.json();
        setEditableArticle(data.correctedText);
    } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
        setIsProofreading(false);
    }
  };

  const handleGenerateFaq = async () => {
    if (!editableArticle) {
        setError("Nėra straipsnio, pagal kurį būtų galima generuoti D.U.K.");
        return;
    }
    setIsFaqLoading(true);
    setError("");
    try {
        const response = await fetch('/api/generate-faq', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: editableArticle, model: selectedModel }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to generate FAQ.");
        }
        const data = await response.json();
        setEditableArticle(prev => prev + `\n<h3>Dažniausiai Užduodami Klausimai</h3>\n` + data.faqHtml);
    } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
        setIsFaqLoading(false);
    }
  };

  const handleSeoAnalysis = async () => {
    if (!editableArticle) {
        setError("Nėra straipsnio, kurį būtų galima analizuoti.");
        return;
    }
    setIsSeoLoading(true);
    setError("");
    setSeoAnalysis(null);
    try {
        // Remove base64 image data before sending to analysis to avoid payload size limits
        const textForAnalysis = editableArticle.replace(/src="data:image\/[^;]+;base64,[^"]+"/g, 'src="about:blank"');

        const response = await fetch('/api/analyze-seo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: textForAnalysis, keywords, title: articleTitle, metaDescription, model: selectedModel }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to analyze SEO.");
        }
        const data = await response.json();
        setSeoAnalysis(data);
    } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
        setIsSeoLoading(false);
    }
  };

  const handleRegenerateArticle = async () => {
    if (!editableArticle || !seoAnalysis?.suggestions) {
        setError("Nėra straipsnio arba pasiūlymų, pagal kuriuos būtų galima pergeneruoti.");
        return;
    }
    setIsRegenerating(true);
    setError("");
    try {
        const response = await fetch('/api/apply-seo-suggestions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                text: editableArticle, 
                suggestions: seoAnalysis.suggestions, 
                title: articleTitle, 
                metaDescription, 
                model: selectedModel 
            }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to apply SEO suggestions.");
        }
        const data = await response.json();
        
        let updatedArticle = editableArticle;
        data.modifications.forEach((mod: { search: string, replace: string }) => {
            updatedArticle = updatedArticle.replace(mod.search, mod.replace);
        });

        setEditableArticle(updatedArticle);
        if (data.regeneratedTitle) {
            setArticleTitle(data.regeneratedTitle);
        }
        if (data.regeneratedMetaTitle) {
            setMetaTitle(data.regeneratedMetaTitle);
        }
        if (data.regeneratedMetaDescription) {
            setMetaDescription(data.regeneratedMetaDescription);
        }
        setSeoAnalysis(null); // Reset analysis after regeneration
        setSeoApplied(true); // Mark SEO as applied
    } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
        setIsRegenerating(false);
    }
  };

  const handleGenerateMeta = async () => {
    if (!articleTitle) {
        setError("Nėra straipsnio pavadinimo, pagal kurį būtų galima generuoti meta aprašymus.");
        return;
    }
    if (keywords.length === 0) {
        setError("Prieš generuojant meta aprašymus, sugeneruokite raktinius žodžius.");
        return;
    }
    setIsMetaLoading(true);
    setError("");
    try {
        const response = await fetch('/api/generate-meta', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: articleTitle, topic, keywords, model: selectedModel }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to generate meta descriptions.");
        }
        const data = await response.json();
        setMetaTitle(data.metaTitle);
        setMetaDescription(data.metaDescription);
    } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
        setIsMetaLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
            <CardTitle>Pasirinkite AI Modelį</CardTitle>
        </CardHeader>
        <CardContent>
            <ModelSelector selectedModel={selectedModel} setSelectedModel={setSelectedModel} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generuoti iš Dokumento ar Nuotraukos</CardTitle>
          <CardDescription>Įkelkite dokumentą (.txt, .pdf, .docx, .xlsx) arba nuotrauką (.jpg, .png) ir leiskite AI automatiškai pasiūlyti pavadinimus bei raktinius žodžius.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-end gap-2">
                <div className="flex-grow space-y-2">
                    <Label htmlFor="document">Dokumento Failas</Label>
                    <Input 
                        id="document" 
                        type="file" 
                        accept=".txt,.pdf,.docx,.xlsx,.png,.jpg"
                        onChange={(e) => setDocumentFile(e.target.files ? e.target.files[0] : null)}
                    />
                </div>
                <Button onClick={handleDocumentAnalysis} disabled={isAnalyzing || !documentFile}>
                    {isAnalyzing ? "Analizuojama..." : "Analizuoti Dokumentą"}
                </Button>
            </div>
            <div className="flex items-center space-x-2">
                <Checkbox id="maintain-style" checked={maintainStyle} onCheckedChange={(checked) => setMaintainStyle(Boolean(checked))} />
                <Label htmlFor="maintain-style">Laikytis panašaus stiliaus perrašant</Label>
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sukurkite Straipsnį su AI</CardTitle>
          <CardDescription>Užpildykite laukus rankiniu būdu arba po dokumento analizės.</CardDescription>
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

            <div className="space-y-2">
              <Label>Meta Aprašymai</Label>
              <div className="space-y-2 rounded-md border p-4">
                <div className="flex items-center gap-2">
                  <Input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} placeholder="Meta Title" />
                  <Button type="button" onClick={handleGenerateMeta} disabled={isMetaLoading || !articleTitle}>
                    {isMetaLoading ? "Generuojama..." : "Generuoti"}
                  </Button>
                </div>
                <Textarea value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} placeholder="Meta Description" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="domain">Jūsų atgalinė nuoroda</Label>
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
              <div className="space-y-2">
                  <Label htmlFor="structure">Straipsnio Struktūra</Label>
                  <Select name="structure" defaultValue="h2-h3">
                      <SelectTrigger id="structure"><SelectValue /></SelectTrigger>
                      <SelectContent>
                          <SelectItem value="h2-h3">Standartinė (H2, H3)</SelectItem>
                          <SelectItem value="h2-only">Tik H2 Antraštės</SelectItem>
                          <SelectItem value="h3-only">Tik H3 Antraštės</SelectItem>
                          <SelectItem value="bold-only">Tik Paryškintos Antraštės</SelectItem>
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
                    <Input id="image" name="image" type="file" className="flex-grow" required />
                    <Button type="button" onClick={handleGenerateImage} disabled={isImageLoading} className="flex-shrink-0">
                        {isImageLoading ? "Generuojama..." : "Generuoti Paveikslėlį"}
                    </Button>
                </div>
            </div>

            {generatedImageUrl && (
                <div className="space-y-2">
                    <Label>Sugeneruotas paveikslėlis</Label>
                    <div className="relative w-full max-w-sm h-64">
                        <Image src={generatedImageUrl} alt="Sugeneruotas AI" fill sizes="100vw" style={{ objectFit: 'contain' }} className="rounded-md border" />
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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Straipsnio Redaktorius</CardTitle>
          <div className="flex gap-2">
            <Button onClick={handleGenerateFaq} disabled={isFaqLoading || !editableArticle}>
              {isFaqLoading ? "Generuojama..." : "Generuoti D.U.K."}
            </Button>
            <Button onClick={handleProofread} disabled={isProofreading || !editableArticle}>
              {isProofreading ? "Taisoma..." : "Tikrinti Rašybą su AI"}
            </Button>
          </div>
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
              <CardTitle>Generuoti Antraščių Paveikslėlius</CardTitle>
              <CardDescription>Pasirinkite antrastes kurioms sugeneruoti paveikslelius</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
              {headings.length > 0 ? (
                <>
                  <div className="space-y-2 pt-4">
                      {headings.map(h => (
                          <div key={h.title} className="flex items-center space-x-2">
                              <Checkbox 
                                  id={h.title} 
                                  onCheckedChange={() => handleHeadingSelection(h.title)}
                                  checked={selectedHeadings.includes(h.title)}
                              />
                              <label htmlFor={h.title} className="text-sm font-medium">
                                  {h.title}
                              </label>
                          </div>
                      ))}
                  </div>
                  <Button onClick={handleGenerateHeadingImages} disabled={isBatchImageLoading || selectedHeadings.length === 0}>
                      {isBatchImageLoading ? "Generuojama..." : "Generuoti ir Įterpti"}
                  </Button>
                </>
              ) : (
                <p className="text-sm text-gray-500">Straipsnyje nerasta H2 antraščių.</p>
              )}
          </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SEO Analizė</CardTitle>
          <CardDescription>Atlikite straipsnio SEO analizę ir gaukite patarimų, kaip jį patobulinti.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {seoApplied ? (
            <div className="text-center p-4 bg-green-50 rounded-md border border-green-200">
              <p className="text-lg font-semibold text-green-700">Straipsnis sėkmingai optimizuotas!</p>
              <p className="text-sm text-green-600">Pritaikius SEO pasiūlymus, jūsų straipsnis yra geriau paruoštas paieškos sistemoms.</p>
            </div>
          ) : (
            <>
              <Button onClick={handleSeoAnalysis} disabled={isSeoLoading || !editableArticle}>
                {isSeoLoading ? "Analizuojama..." : "Atlikti SEO Analizę"}
              </Button>
              {seoAnalysis && (
                <div className="space-y-6 pt-4">
                  <div className="text-center p-6 bg-gray-50 rounded-xl">
                    <p className="text-sm font-medium text-gray-500">SEO ĮVERTINIMAS</p>
                    <p className={`text-6xl font-bold ${seoAnalysis.seoScore > 85 ? 'text-green-600' : seoAnalysis.seoScore > 60 ? 'text-yellow-500' : 'text-red-500'}`}>
                      {seoAnalysis.seoScore}
                      <span className="text-2xl text-gray-400">/ 100</span>
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h3 className="font-semibold text-lg flex items-center text-green-700">
                        <CheckCircle className="h-5 w-5 mr-2" />
                        Privalumai
                      </h3>
                      <ul className="space-y-2 text-sm text-gray-700">
                        {seoAnalysis.goodPoints.map((point: string, i: number) => (
                          <li key={i} className="flex items-start">
                            <CheckCircle className="h-4 w-4 mr-2 mt-1 text-green-500 flex-shrink-0" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-3">
                      <h3 className="font-semibold text-lg flex items-center text-yellow-700">
                        <Lightbulb className="h-5 w-5 mr-2" />
                        Pasiūlymai
                      </h3>
                      <ul className="space-y-2 text-sm text-gray-700">
                        {seoAnalysis.suggestions.map((suggestion: string, i: number) => (
                          <li key={i} className="flex items-start">
                            <Lightbulb className="h-4 w-4 mr-2 mt-1 text-yellow-500 flex-shrink-0" />
                            <span>{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  {seoAnalysis.suggestions.length > 0 && (
                    <div className="text-center pt-4">
                      <Button onClick={handleRegenerateArticle} disabled={isRegenerating} size="lg">
                        {isRegenerating ? "Atliekami pakeitimai..." : "Taikyti Pakeitimus"}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
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
