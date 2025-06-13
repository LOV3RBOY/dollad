import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Play, Pause, Square, SkipBack, SkipForward, Mic, Upload, Radio, Settings, 
  Save, Download, Sparkles, Music, Plus, X, Volume2, VolumeX, Zap, AudioLines,
  Sliders, Headphones, Timer, BarChart3, Activity, Layers, Target, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";

// Interface definitions
interface Project {
  id: number;
  name: string;
  description?: string;
  genre?: string;
  bpm?: number;
  keySignature?: string;
  settings: {
    targetLoudness: number;
    outputFormat: string;
    sampleRate: number;
    bitDepth?: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface Stem {
  id: number;
  projectId: number;
  name: string;
  type: string;
  fileUrl: string;
  volume: number;
  pan: number;
  soloEnabled: boolean;
  muteEnabled: boolean;
  analysis?: {
    peakLevel: number;
    averageLevel: number;
    loudness: number;
    dynamicRange: number;
    spectralCentroid: number;
    keyEstimate: string;
    bpmEstimate: number;
    typeConfidence: number;
    suitability: number;
  };
}

interface MixJob {
  id: number;
  projectId: number;
  prompt: string;
  status: string;
  progress: number;
  currentPhase?: string;
  settings: {
    style: string;
    mood: string;
    intensity: number;
    targetLoudness: number;
    stereoWidth: number;
    dynamicRange: string;
    mixStyle: string;
    matchReference: boolean;
    generateMissing: boolean;
    professionalMaster: boolean;
  };
  resultFileUrl?: string;
}

export default function Studio() {
  // State management
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [newProjectDialog, setNewProjectDialog] = useState(false);
  const [uploadStemDialog, setUploadStemDialog] = useState(false);
  const [aiMixDialog, setAiMixDialog] = useState(false);
  const [mixPrompt, setMixPrompt] = useState("");
  const [masterVolume, setMasterVolume] = useState([85]);
  
  // Query client for cache management
  const queryClient = useQueryClient();

  // Fetch projects
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiRequest('/api/projects'),
  });

  // Fetch stems for selected project  
  const { data: stems = [], isLoading: stemsLoading } = useQuery({
    queryKey: ['stems', selectedProject?.id],
    queryFn: () => selectedProject ? apiRequest(`/api/projects/${selectedProject.id}/stems`) : [],
    enabled: !!selectedProject,
  });

  // Fetch active mix jobs
  const { data: mixJobs = [] } = useQuery({
    queryKey: ['mix-jobs', selectedProject?.id],
    queryFn: () => selectedProject ? apiRequest(`/api/projects/${selectedProject.id}/mix-jobs`) : [],
    enabled: !!selectedProject,
    // Ensure data is always an array
    select: (response) => Array.isArray(response) ? response : [],
    // Only poll if there are active jobs
    refetchInterval: (data) => {
      // Now data is guaranteed to be an array due to select above
      return data.some((job: MixJob) => ['pending', 'processing'].includes(job.status))
        ? 5000             // poll every 5 seconds while condition is met
        : false;            // otherwise stop polling
    },
  });

  // Create new project mutation
  const createProjectMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setNewProjectDialog(false);
    },
  });

  // Upload stem mutation
  const uploadStemMutation = useMutation({
    mutationFn: ({ projectId, formData }: { projectId: number, formData: FormData }) => 
      apiRequest(`/api/projects/${projectId}/stems`, {
        method: 'POST',
        body: formData,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stems', selectedProject?.id] });
      setUploadStemDialog(false);
    },
  });

  // Start AI mix mutation
  const startAiMixMutation = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/projects/${selectedProject?.id}/mix`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mix-jobs', selectedProject?.id] });
      setAiMixDialog(false);
      setMixPrompt("");
    },
  });

  // Select first project by default
  useEffect(() => {
    if (projects.length > 0 && !selectedProject) {
      setSelectedProject(projects[0]);
    }
  }, [projects.length]); // Only depend on projects.length, not the entire projects array

  // Transport control handlers
  const handlePlayPause = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleStop = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  const handleSkipBack = useCallback(() => {
    setCurrentTime(Math.max(0, currentTime - 10));
  }, [currentTime]);

  const handleSkipForward = useCallback(() => {
    setCurrentTime(Math.min(duration, currentTime + 10));
  }, [currentTime, duration]);

  // Stem control handlers
  const handleVolumeChange = useCallback((stemId: number, volume: number) => {
    // Update stem volume via API
    apiRequest(`/api/stems/${stemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ volume }),
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: ['stems', selectedProject?.id] });
    });
  }, [queryClient, selectedProject?.id]);

  const handleMuteToggle = useCallback((stemId: number, muted: boolean) => {
    apiRequest(`/api/stems/${stemId}`, {
      method: 'PATCH', 
      body: JSON.stringify({ muteEnabled: muted }),
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: ['stems', selectedProject?.id] });
    });
  }, [queryClient, selectedProject?.id]);

  const handleSoloToggle = useCallback((stemId: number, solo: boolean) => {
    apiRequest(`/api/stems/${stemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ soloEnabled: solo }),
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: ['stems', selectedProject?.id] });
    });
  }, [queryClient, selectedProject?.id]);

  // Get stem color class based on type
  const getStemColor = (type: string) => {
    const colorMap: Record<string, string> = {
      drums: 'text-stem-drums',
      bass: 'text-stem-bass', 
      vocals: 'text-stem-vocals',
      guitar: 'text-stem-guitar',
      keys: 'text-stem-keys',
      synth: 'text-stem-synth',
      strings: 'text-stem-strings',
      brass: 'text-stem-brass',
      fx: 'text-stem-fx',
    };
    return colorMap[type.toLowerCase()] || 'text-stem-other';
  };

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const activeMixJob = mixJobs.find((job: MixJob) => ['pending', 'processing'].includes(job.status));

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Enhanced Header */}
      <header className="glass-card m-4 mb-6">
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center glow-primary">
              <AudioLines className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="heading-lg">AudioLabStudio</h1>
              <p className="text-foreground-muted">Professional AI-Powered Audio Production</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              onClick={() => setNewProjectDialog(true)}
              className="btn-primary hover-lift"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
            
            <Button variant="outline" className="btn-secondary">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>
      </header>

      <div className="flex gap-6 p-4">
        {/* Left Sidebar - Projects & Reference */}
        <div className="w-80 space-y-6">
          {/* Project Selector */}
          <Card className="glass-card hover-lift">
            <CardHeader>
              <CardTitle className="heading-md flex items-center gap-2">
                <Music className="w-5 h-5 text-primary" />
                Projects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-40">
                <div className="space-y-2">
                  {projects.map((project: Project) => (
                    <div
                      key={project.id}
                      onClick={() => setSelectedProject(project)}
                      className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                        selectedProject?.id === project.id
                          ? 'bg-primary text-white glow-primary'
                          : 'hover:bg-background-elevated border border-border hover:border-primary'
                      }`}
                    >
                      <div className="font-medium">{project.name}</div>
                      <div className="text-sm opacity-70">
                        {project.genre && <Badge variant="outline" className="mr-2">{project.genre}</Badge>}
                        {project.bpm && <span>{project.bpm} BPM</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Master Controls */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="heading-md flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-accent" />
                Master
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Master Volume</Label>
                <Slider
                  value={masterVolume}
                  onValueChange={setMasterVolume}
                  max={100}
                  step={1}
                  className="mt-2"
                />
                <div className="text-xs text-foreground-muted mt-1">
                  {masterVolume[0]}%
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button size="sm" className="btn-secondary flex-1">
                  <Save className="w-4 h-4 mr-1" />
                  Save
                </Button>
                <Button size="sm" className="btn-secondary flex-1">
                  <Download className="w-4 h-4 mr-1" />
                  Export
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 space-y-6">
          {/* Transport Controls */}
          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button
                    size="lg"
                    onClick={handlePlayPause}
                    className={`w-12 h-12 rounded-full ${
                      isPlaying ? 'btn-secondary' : 'btn-primary pulse-glow'
                    }`}
                  >
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                  </Button>
                  
                  <Button size="sm" onClick={handleStop} className="btn-secondary">
                    <Square className="w-4 h-4" />
                  </Button>
                  
                  <Button size="sm" onClick={handleSkipBack} className="btn-secondary">
                    <SkipBack className="w-4 h-4" />
                  </Button>
                  
                  <Button size="sm" onClick={handleSkipForward} className="btn-secondary">
                    <SkipForward className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-sm font-mono">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </div>
                  
                  <Button 
                    onClick={() => setAiMixDialog(true)}
                    className="btn-primary hover-lift"
                    disabled={!selectedProject || stems.length === 0}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    AI Mix
                  </Button>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-4">
                <Progress 
                  value={(currentTime / duration) * 100} 
                  className="h-2 bg-background-elevated"
                />
              </div>
            </CardContent>
          </Card>

          {/* Active Mix Job Status */}
          {activeMixJob && (
            <Card className="glass-card border-primary glow-primary">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <Activity className="w-4 h-4 text-white animate-pulse" />
                    </div>
                    <div>
                      <h3 className="font-semibold">AI Mixing in Progress</h3>
                      <p className="text-sm text-foreground-muted">
                        {activeMixJob.currentPhase || 'Processing...'}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-primary text-white">
                    {activeMixJob.progress}%
                  </Badge>
                </div>
                <Progress value={activeMixJob.progress} className="h-2" />
              </CardContent>
            </Card>
          )}

          {/* Stems Section */}
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="heading-md flex items-center gap-2">
                <Layers className="w-5 h-5 text-accent" />
                Audio Stems
                {stems.length > 0 && (
                  <Badge variant="outline">{stems.length}</Badge>
                )}
              </CardTitle>
              
              <Button 
                onClick={() => setUploadStemDialog(true)}
                className="btn-primary"
                disabled={!selectedProject}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Stem
              </Button>
            </CardHeader>
            
            <CardContent>
              {stems.length === 0 ? (
                <div className="text-center py-12 text-foreground-muted">
                  <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No stems uploaded yet</p>
                  <p className="text-sm">Upload audio files to start mixing</p>
                </div>
              ) : (
                <ScrollArea className="h-80">
                  <div className="space-y-3">
                    {stems.map((stem: Stem) => (
                      <div key={stem.id} className="stem-track">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full bg-stem-${stem.type}`} />
                            <div>
                              <div className="font-medium">{stem.name}</div>
                              <div className="text-sm text-foreground-muted">
                                <Badge variant="outline" className={getStemColor(stem.type)}>
                                  {stem.type}
                                </Badge>
                                {stem.analysis && (
                                  <span className="ml-2">
                                    {stem.analysis.bpmEstimate} BPM • {stem.analysis.keyEstimate}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            {/* Volume Control */}
                            <div className="w-24">
                              <Slider
                                value={[stem.volume]}
                                onValueChange={(value) => handleVolumeChange(stem.id, value[0])}
                                max={100}
                                step={1}
                                className="h-2"
                              />
                            </div>
                            
                            {/* Mute/Solo Controls */}
                            <Button
                              size="sm"
                              variant={stem.muteEnabled ? "default" : "outline"}
                              onClick={() => handleMuteToggle(stem.id, !stem.muteEnabled)}
                            >
                              {stem.muteEnabled ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                            </Button>
                            
                            <Button
                              size="sm"  
                              variant={stem.soloEnabled ? "default" : "outline"}
                              onClick={() => handleSoloToggle(stem.id, !stem.soloEnabled)}
                            >
                              <Headphones className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* New Project Dialog */}
      <Dialog open={newProjectDialog} onOpenChange={setNewProjectDialog}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle className="heading-md">Create New Project</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            createProjectMutation.mutate({
              name: formData.get('name'),
              description: formData.get('description'),
              genre: formData.get('genre'),
              bpm: parseInt(formData.get('bpm') as string) || undefined,
              keySignature: formData.get('keySignature'),
            });
          }}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">Project Name</Label>
                <Input id="name" name="name" required className="mt-1" />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" className="mt-1" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="genre">Genre</Label>
                  <Select name="genre">
                    <SelectTrigger>
                      <SelectValue placeholder="Select genre" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pop">Pop</SelectItem>
                      <SelectItem value="rock">Rock</SelectItem>
                      <SelectItem value="electronic">Electronic</SelectItem>
                      <SelectItem value="hiphop">Hip Hop</SelectItem>
                      <SelectItem value="jazz">Jazz</SelectItem>
                      <SelectItem value="classical">Classical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="bpm">BPM</Label>
                  <Input id="bpm" name="bpm" type="number" min="60" max="200" className="mt-1" />
                </div>
              </div>
              
              <div>
                <Label htmlFor="keySignature">Key Signature</Label>
                <Select name="keySignature">
                  <SelectTrigger>
                    <SelectValue placeholder="Select key" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="C">C Major</SelectItem>
                    <SelectItem value="G">G Major</SelectItem>
                    <SelectItem value="D">D Major</SelectItem>
                    <SelectItem value="A">A Major</SelectItem>
                    <SelectItem value="E">E Major</SelectItem>
                    <SelectItem value="Am">A Minor</SelectItem>
                    <SelectItem value="Em">E Minor</SelectItem>
                    <SelectItem value="Bm">B Minor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setNewProjectDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" className="btn-primary" disabled={createProjectMutation.isPending}>
                {createProjectMutation.isPending ? 'Creating...' : 'Create Project'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Upload Stem Dialog */}
      <Dialog open={uploadStemDialog} onOpenChange={setUploadStemDialog}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle className="heading-md">Upload Audio Stem</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            if (selectedProject) {
              uploadStemMutation.mutate({ 
                projectId: selectedProject.id, 
                formData 
              });
            }
          }}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="stemFile">Audio File</Label>
                <Input 
                  id="stemFile" 
                  name="file" 
                  type="file" 
                  accept="audio/*" 
                  required 
                  className="mt-1" 
                />
                <p className="text-sm text-foreground-muted mt-1">
                  Supports WAV, MP3, FLAC, AIFF (max 100MB)
                </p>
              </div>
              
              <div>
                <Label htmlFor="stemName">Stem Name</Label>
                <Input id="stemName" name="name" required className="mt-1" />
              </div>
              
              <div>
                <Label htmlFor="stemType">Stem Type</Label>
                <Select name="type">
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="drums">Drums</SelectItem>
                    <SelectItem value="bass">Bass</SelectItem>
                    <SelectItem value="vocals">Vocals</SelectItem>
                    <SelectItem value="guitar">Guitar</SelectItem>
                    <SelectItem value="keys">Keys</SelectItem>
                    <SelectItem value="synth">Synth</SelectItem>
                    <SelectItem value="strings">Strings</SelectItem>
                    <SelectItem value="brass">Brass</SelectItem>
                    <SelectItem value="fx">FX</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setUploadStemDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" className="btn-primary" disabled={uploadStemMutation.isPending}>
                {uploadStemMutation.isPending ? 'Uploading...' : 'Upload Stem'}  
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* AI Mix Dialog */}
      <Dialog open={aiMixDialog} onOpenChange={setAiMixDialog}>
        <DialogContent className="glass-card max-w-2xl">
          <DialogHeader>
            <DialogTitle className="heading-md flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              AI-Powered Mixing
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div>
              <Label htmlFor="mixPrompt" className="text-base font-medium">
                Describe your vision
              </Label>
              <Textarea
                id="mixPrompt"
                value={mixPrompt}
                onChange={(e) => setMixPrompt(e.target.value)}
                placeholder="e.g., 'Create a modern pop mix with punchy drums, warm vocals, and wide stereo image'"
                className="h-24 mt-2"
              />
              <p className="text-sm text-foreground-muted mt-2">
                Be specific about the style, mood, and elements you want emphasized
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Mix Style</Label>
                <Select defaultValue="modern">
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="modern">Modern</SelectItem>
                    <SelectItem value="vintage">Vintage</SelectItem>
                    <SelectItem value="clean">Clean</SelectItem>
                    <SelectItem value="compressed">Compressed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Target Loudness</Label>
                <Select defaultValue="-14">
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-23">-23 LUFS (Broadcast)</SelectItem>
                    <SelectItem value="-16">-16 LUFS (Apple Music)</SelectItem>
                    <SelectItem value="-14">-14 LUFS (Spotify)</SelectItem>
                    <SelectItem value="-13">-13 LUFS (YouTube)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setAiMixDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (mixPrompt.trim() && selectedProject) {
                  startAiMixMutation.mutate({
                    prompt: mixPrompt,
                    settings: {
                      style: 'modern',
                      targetLoudness: -14,
                      professionalMaster: true,
                    }
                  });
                }
              }}
              className="btn-primary glow-primary"
              disabled={!mixPrompt.trim() || startAiMixMutation.isPending}
            >
              {startAiMixMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 animate-spin" />
                  Starting Mix...
                </div>  
              ) : (
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Start AI Mix
                </div>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}