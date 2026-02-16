/**
 * AssetLibrary Component
 * 
 * Manages visual assets (images, slides, logos) with reference keys
 * for use in Agentforce responses.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Image, FileImage, Video, Tag, Plus, Trash2, Save, 
  Loader2, ExternalLink, Copy, Check, X, Code, ChevronDown, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import VisualPositionEditor from "./VisualPositionEditor";

interface VisualAsset {
  id?: number;
  agentType: string;
  name: string;
  assetType: 'slide' | 'logo' | 'image' | 'video';
  url: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number | null;
  referenceKey: string | null;
}

interface AssetLibraryProps {
  agentType: 'keynote' | 'chat' | 'all';
  password: string;
  onMessage: (msg: { type: 'success' | 'error', text: string }) => void;
}

const ASSET_TYPES = [
  { value: 'slide', label: 'Slide', icon: FileImage },
  { value: 'logo', label: 'Logo', icon: Tag },
  { value: 'image', label: 'Image', icon: Image },
  { value: 'video', label: 'Video', icon: Video },
];

// Generate JSON example for an asset
const generateJsonExample = (asset: VisualAsset): string => {
  const example = {
    response: `Here's the ${asset.name}.`,
    actions: [
      {
        type: "showAsset",
        ref: asset.referenceKey || "your_reference_key",
        // Duration is optional - if omitted, asset stays until next message
      }
    ]
  };
  return JSON.stringify(example, null, 2);
};

const AssetLibrary = ({ agentType, password, onMessage }: AssetLibraryProps) => {
  const [assets, setAssets] = useState<VisualAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingAsset, setEditingAsset] = useState<VisualAsset | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [expandedJsonAsset, setExpandedJsonAsset] = useState<number | null>(null);
  const [copiedJson, setCopiedJson] = useState<number | null>(null);

  const getAuthHeader = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${password}`,
  });

  const fetchAssets = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/agent-config/${agentType}/assets`);
      if (!res.ok) throw new Error('Failed to fetch assets');
      const data = await res.json();
      setAssets(data.assets || []);
    } catch (error) {
      console.error('Error fetching assets:', error);
      onMessage({ type: 'error', text: 'Failed to load assets' });
    } finally {
      setIsLoading(false);
    }
  }, [agentType, onMessage]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const saveAsset = async (asset: VisualAsset) => {
    setIsSaving(true);
    try {
      const method = asset.id ? 'PUT' : 'POST';
      const url = asset.id 
        ? `/api/agent-config/${agentType}/assets/${asset.id}`
        : `/api/agent-config/${agentType}/assets`;
      
      const res = await fetch(url, {
        method,
        headers: getAuthHeader(),
        body: JSON.stringify(asset),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save asset');
      }
      
      await fetchAssets();
      setEditingAsset(null);
      onMessage({ type: 'success', text: 'Asset saved!' });
    } catch (error: any) {
      console.error('Error saving asset:', error);
      onMessage({ type: 'error', text: error.message || 'Failed to save asset' });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteAsset = async (id: number) => {
    if (!confirm('Are you sure you want to delete this asset?')) return;
    
    setIsSaving(true);
    try {
      const res = await fetch(`/api/agent-config/${agentType}/assets/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });
      
      if (!res.ok) throw new Error('Failed to delete asset');
      
      await fetchAssets();
      onMessage({ type: 'success', text: 'Asset deleted' });
    } catch (error) {
      console.error('Error deleting asset:', error);
      onMessage({ type: 'error', text: 'Failed to delete asset' });
    } finally {
      setIsSaving(false);
    }
  };

  const addNewAsset = () => {
    setEditingAsset({
      agentType,
      name: 'New Asset',
      assetType: 'image',
      url: '',
      positionX: 50,
      positionY: 50,
      width: 50,
      height: null,
      referenceKey: null,
    });
  };

  const copyReferenceKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getAssetIcon = (type: string) => {
    const found = ASSET_TYPES.find(t => t.value === type);
    if (!found) return Image;
    return found.icon;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Asset Library</h2>
          <p className="text-sm text-muted-foreground">
            Images and slides for Agentforce to reference in responses
          </p>
        </div>
        <Button onClick={addNewAsset}>
          <Plus className="w-4 h-4 mr-2" />
          Add Asset
        </Button>
      </div>

      {/* Asset List */}
      {assets.length === 0 && !editingAsset ? (
        <div className="rounded-xl border border-border p-8 text-center">
          <Image className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No assets configured</p>
          <Button className="mt-4" onClick={addNewAsset}>
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Asset
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Existing Assets */}
          {assets.map((asset) => {
            const Icon = getAssetIcon(asset.assetType);
            
            return (
              <div 
                key={asset.id} 
                className="rounded-xl border border-border p-4 hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Preview */}
                  <div className="w-20 h-20 rounded-lg bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                    {asset.url && (asset.assetType === 'image' || asset.assetType === 'slide' || asset.assetType === 'logo') ? (
                      <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                    ) : (
                      <Icon className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{asset.name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                        {asset.assetType}
                      </span>
                    </div>
                    
                    {asset.referenceKey && (
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs bg-secondary px-2 py-1 rounded font-mono">
                          {asset.referenceKey}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => copyReferenceKey(asset.referenceKey!)}
                        >
                          {copiedKey === asset.referenceKey ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                    )}
                    
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      Position: {asset.positionX}% x {asset.positionY}% | Width: {asset.width}%
                    </p>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {asset.referenceKey && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedJsonAsset(expandedJsonAsset === asset.id ? null : asset.id!)}
                        title="Show JSON example"
                      >
                        <Code className="w-4 h-4" />
                      </Button>
                    )}
                    {asset.url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(asset.url, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingAsset(asset)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => asset.id && deleteAsset(asset.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Expandable JSON Example */}
                {expandedJsonAsset === asset.id && asset.referenceKey && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        Agentforce JSON Example
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => {
                          navigator.clipboard.writeText(generateJsonExample(asset));
                          setCopiedJson(asset.id!);
                          setTimeout(() => setCopiedJson(null), 2000);
                          onMessage({ type: 'success', text: 'JSON copied to clipboard' });
                        }}
                      >
                        {copiedJson === asset.id ? (
                          <>
                            <Check className="w-3 h-3 mr-1 text-green-500" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 mr-1" />
                            Copy JSON
                          </>
                        )}
                      </Button>
                    </div>
                    <pre className="bg-secondary p-3 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                      {generateJsonExample(asset)}
                    </pre>
                    <p className="text-xs text-muted-foreground mt-2">
                      <strong>Note:</strong> Duration is optional. If omitted, the asset will stay visible 
                      until the next message that doesn't reference it.
                    </p>
                  </div>
                )}
              </div>
            );
          })}

          {/* Edit/Create Modal */}
          <AnimatePresence>
            {editingAsset && (
              <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setEditingAsset(null)}
              >
                <motion.div
                  className="relative bg-background rounded-xl overflow-hidden shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-4 border-b border-border flex items-center justify-between">
                    <h3 className="font-semibold">
                      {editingAsset.id ? 'Edit Asset' : 'New Asset'}
                    </h3>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setEditingAsset(null)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Name</Label>
                        <Input
                          value={editingAsset.name}
                          onChange={(e) => setEditingAsset({ ...editingAsset, name: e.target.value })}
                          placeholder="Asset name"
                        />
                      </div>
                      <div>
                        <Label>Type</Label>
                        <Select 
                          value={editingAsset.assetType} 
                          onValueChange={(v) => setEditingAsset({ ...editingAsset, assetType: v as any })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ASSET_TYPES.map(t => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div>
                      <Label>URL</Label>
                      <Input
                        value={editingAsset.url}
                        onChange={(e) => setEditingAsset({ ...editingAsset, url: e.target.value })}
                        placeholder="https://example.com/image.png"
                      />
                    </div>
                    
                    <div>
                      <Label>Reference Key</Label>
                      <p className="text-xs text-muted-foreground mb-1">
                        Unique key for Agentforce to reference (e.g., logo_salesforce)
                      </p>
                      <Input
                        value={editingAsset.referenceKey || ''}
                        onChange={(e) => setEditingAsset({ 
                          ...editingAsset, 
                          referenceKey: e.target.value || null 
                        })}
                        placeholder="logo_salesforce"
                        className="font-mono"
                      />
                    </div>
                    
                    {/* Visual Position Editor */}
                    <VisualPositionEditor
                      imageUrl={editingAsset.url}
                      name={editingAsset.name}
                      position={{
                        x: editingAsset.positionX,
                        y: editingAsset.positionY,
                        width: editingAsset.width,
                        height: editingAsset.height,
                      }}
                      onChange={(pos) => setEditingAsset({
                        ...editingAsset,
                        positionX: pos.x,
                        positionY: pos.y,
                        width: pos.width,
                        height: pos.height,
                      })}
                    />
                  </div>
                  
                  <div className="p-4 border-t border-border flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setEditingAsset(null)}>
                      Cancel
                    </Button>
                    <Button onClick={() => saveAsset(editingAsset)} disabled={isSaving}>
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save Asset
                    </Button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Usage Example */}
      <div className="rounded-xl border border-border p-4 bg-secondary/30">
        <h3 className="text-sm font-medium mb-2">How to use in Agentforce</h3>
        <p className="text-xs text-muted-foreground mb-2">
          Configure your agent to respond with JSON that references assets by their key.
          Click the <Code className="w-3 h-3 inline" /> button on any asset above to see its specific JSON example.
        </p>
        <pre className="bg-secondary p-3 rounded-lg text-xs font-mono overflow-x-auto">
{`{
  "response": "Here's our company logo.",
  "actions": [
    {
      "type": "showAsset",
      "ref": "logo_salesforce"
    }
  ]
}`}
        </pre>
        <div className="mt-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <p className="text-xs text-blue-600 dark:text-blue-400">
            <strong>Duration is optional!</strong> If you don't specify a duration, the asset will stay 
            visible until the next message that doesn't reference it. This allows natural conversation 
            flow where visuals persist until the topic changes.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AssetLibrary;
