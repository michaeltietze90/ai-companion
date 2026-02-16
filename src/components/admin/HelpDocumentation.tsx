/**
 * HelpDocumentation Component
 * 
 * Provides comprehensive documentation for all admin settings features.
 * Collapsible sections explain keyword boosting, video triggers, and overlay system.
 */

import { useState } from "react";
import { 
  ChevronDown, ChevronRight, Mic, Video, Image, 
  Zap, MessageSquare, HelpCircle, ExternalLink, Code
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const CollapsibleSection = ({ title, icon, defaultOpen = false, children }: CollapsibleSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center gap-3 p-4 hover:bg-secondary/50 transition-colors text-left"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-primary">{icon}</span>
        <span className="flex-1 font-medium">{title}</span>
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      {isOpen && (
        <div className="p-4 pt-0 border-t border-border/50 bg-secondary/20">
          {children}
        </div>
      )}
    </div>
  );
};

const CodeBlock = ({ children, title }: { children: string; title?: string }) => (
  <div className="rounded-lg overflow-hidden my-3">
    {title && (
      <div className="bg-secondary/80 px-3 py-1 text-xs text-muted-foreground font-mono">
        {title}
      </div>
    )}
    <pre className="bg-secondary p-3 overflow-x-auto text-sm font-mono whitespace-pre-wrap">
      {children}
    </pre>
  </div>
);

const HelpDocumentation = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-6">
        <HelpCircle className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">Documentation</h2>
      </div>

      {/* Overview */}
      <CollapsibleSection title="System Overview" icon={<Zap className="w-5 h-5" />} defaultOpen>
        <div className="space-y-3 text-sm">
          <p>
            The Frank Avatar system has three main configurable features that work together 
            to create interactive experiences:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>
              <strong className="text-foreground">Keyword Boosting</strong> — Improves speech 
              recognition accuracy for specific words
            </li>
            <li>
              <strong className="text-foreground">Video Triggers</strong> — Intercepts messages 
              and plays videos instead of calling Agentforce
            </li>
            <li>
              <strong className="text-foreground">Visual Overlays</strong> — Displays images/slides 
              triggered by Agentforce JSON responses
            </li>
          </ol>
          
          <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-xs font-medium text-primary">
              Flow: User Speech → Deepgram (keywords boost recognition) → Trigger Check → 
              {" "}If match: Play Video | If no match: Call Agentforce → Parse Response → Show Visuals
            </p>
          </div>
        </div>
      </CollapsibleSection>

      {/* Keyword Boosting */}
      <CollapsibleSection title="Keyword Boosting" icon={<Mic className="w-5 h-5" />}>
        <div className="space-y-4 text-sm">
          <p>
            Keyword boosting improves Deepgram's speech recognition accuracy for specific 
            words and phrases. This is especially useful for:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Brand names (Salesforce, Agentforce, Einstein)</li>
            <li>Technical terms that are often misheard</li>
            <li>Names of people or products</li>
            <li>Industry-specific jargon</li>
          </ul>

          <div className="mt-4">
            <h4 className="font-medium mb-2">Boost Values</h4>
            <p className="text-muted-foreground mb-2">
              Values range from <strong>1</strong> (slight boost) to <strong>5</strong> (strong boost). 
              The UI allows 1-10, but Deepgram caps at 5 internally.
            </p>
            <table className="w-full text-xs border border-border rounded">
              <thead className="bg-secondary">
                <tr>
                  <th className="px-3 py-2 text-left">Boost</th>
                  <th className="px-3 py-2 text-left">Effect</th>
                  <th className="px-3 py-2 text-left">Use Case</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-t border-border">
                  <td className="px-3 py-2">1-2</td>
                  <td className="px-3 py-2">Slight increase</td>
                  <td className="px-3 py-2">Common words occasionally misheard</td>
                </tr>
                <tr className="border-t border-border">
                  <td className="px-3 py-2">3-4</td>
                  <td className="px-3 py-2">Moderate increase</td>
                  <td className="px-3 py-2">Technical terms, brand names</td>
                </tr>
                <tr className="border-t border-border">
                  <td className="px-3 py-2">5+</td>
                  <td className="px-3 py-2">Strong increase</td>
                  <td className="px-3 py-2">Rare words, critical keywords</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <p className="text-xs text-yellow-600 dark:text-yellow-400">
              <strong>Note:</strong> Keywords are case-insensitive. Adding too many keywords 
              with high boosts can cause false positives.
            </p>
          </div>
        </div>
      </CollapsibleSection>

      {/* Video Triggers */}
      <CollapsibleSection title="Video Triggers" icon={<Video className="w-5 h-5" />}>
        <div className="space-y-4 text-sm">
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              <strong>Key Concept:</strong> Video triggers intercept user messages 
              <strong> BEFORE</strong> they reach Agentforce. The AI is completely bypassed.
            </p>
          </div>

          <h4 className="font-medium">How It Works</h4>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>User says something containing a trigger keyword</li>
            <li>System detects the keyword match</li>
            <li>Video plays in the specified position</li>
            <li>Optional speech is spoken by the avatar</li>
            <li><strong>Agentforce is NOT called</strong> — no API request is made</li>
          </ol>

          <h4 className="font-medium mt-4">Configuration Fields</h4>
          <dl className="space-y-2 text-muted-foreground">
            <div>
              <dt className="font-medium text-foreground">Name</dt>
              <dd className="ml-4">A friendly name to identify this trigger (for your reference)</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Keywords</dt>
              <dd className="ml-4">
                Comma-separated list of words/phrases that activate this trigger. 
                All keywords are matched case-insensitively.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Video URL</dt>
              <dd className="ml-4">
                Direct URL to an MP4 or WebM video file. Can be hosted on the 
                Media Hosting app or any public URL.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Duration</dt>
              <dd className="ml-4">
                "Full video" plays the entire video. "Custom" lets you specify 
                a duration in milliseconds (e.g., 5000 = 5 seconds).
              </dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Position</dt>
              <dd className="ml-4">
                Where the video appears: "Avatar" seamlessly overlays the avatar, 
                or Center/Top/Bottom/Left/Right positions.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Speech</dt>
              <dd className="ml-4">
                Optional text for the avatar to speak when the trigger activates. 
                Leave empty for silent video playback.
              </dd>
            </div>
          </dl>

          <h4 className="font-medium mt-4">Use Cases</h4>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Pre-recorded product demos</li>
            <li>Easter eggs and fun interactions</li>
            <li>Specific visual responses (e.g., "show me a backflip")</li>
            <li>Branded intro/outro videos</li>
          </ul>
        </div>
      </CollapsibleSection>

      {/* Visual Overlays */}
      <CollapsibleSection title="Image/Slide Overlays" icon={<Image className="w-5 h-5" />}>
        <div className="space-y-4 text-sm">
          <p>
            Visual overlays are triggered by <strong>Agentforce JSON responses</strong>. 
            Unlike video triggers, these require the AI to respond with structured data.
          </p>

          <h4 className="font-medium">How It Works</h4>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>User asks a question</li>
            <li>Message goes to Agentforce (no trigger match)</li>
            <li>Agentforce responds with JSON containing visual instructions</li>
            <li>System parses JSON and displays images/slides</li>
            <li>Avatar speaks the response text</li>
          </ol>

          <h4 className="font-medium mt-4">JSON Response Format</h4>
          <p className="text-muted-foreground">
            Agentforce must respond with a specific JSON structure:
          </p>

          <CodeBlock title="Example: Slide Display">
{`{
  "text": "Here's our Q4 revenue breakdown.",
  "actions": [
    {
      "type": "slide",
      "url": "https://example.com/slide.png",
      "position": "right",
      "duration": 10000
    }
  ]
}`}
          </CodeBlock>

          <CodeBlock title="Example: Multiple Actions">
{`{
  "text": "Let me show you our product lineup.",
  "actions": [
    {
      "type": "showVisual",
      "ref": "logo_salesforce",
      "position": "top-right",
      "duration": 5000
    },
    {
      "type": "slide",
      "url": "https://example.com/products.png"
    }
  ]
}`}
          </CodeBlock>

          <h4 className="font-medium mt-4">Action Types</h4>
          <dl className="space-y-2 text-muted-foreground">
            <div>
              <dt className="font-medium text-foreground">slide</dt>
              <dd className="ml-4">Display an image/slide by URL</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">showVisual</dt>
              <dd className="ml-4">Display an asset by reference key (from Asset Library)</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">showAsset</dt>
              <dd className="ml-4">Alias for showVisual</dd>
            </div>
          </dl>

          <h4 className="font-medium mt-4">Position Values</h4>
          <p className="text-muted-foreground">
            center, top, bottom, left, right, top-left, top-right, bottom-left, bottom-right
          </p>

          <div className="mt-4 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <p className="text-xs text-purple-600 dark:text-purple-400">
              <strong>Tip:</strong> Configure your Agentforce agent prompt to respond with 
              JSON when visual content should be displayed. Include instructions like 
              "When showing slides, respond with JSON format containing actions array."
            </p>
          </div>
        </div>
      </CollapsibleSection>

      {/* JSON vs Text Mode */}
      <CollapsibleSection title="JSON vs Text Mode" icon={<Code className="w-5 h-5" />}>
        <div className="space-y-4 text-sm">
          <p>
            The system automatically detects whether Agentforce responses are JSON or plain text:
          </p>

          <h4 className="font-medium">Text Mode (Default for Keynote)</h4>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Response streams sentence-by-sentence</li>
            <li>Avatar starts speaking as soon as first sentence arrives</li>
            <li>Lower latency, more natural conversation flow</li>
          </ul>

          <h4 className="font-medium mt-4">JSON Mode (Default for Exec Experience)</h4>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Waits for complete JSON before processing</li>
            <li>Parses actions array for visual instructions</li>
            <li>Extracts "text" field for avatar speech</li>
            <li>Slightly higher latency but enables visual features</li>
          </ul>

          <div className="mt-4">
            <h4 className="font-medium mb-2">Detection Logic</h4>
            <CodeBlock>
{`if (response.startsWith('{')) {
  // Wait for complete JSON, then parse
  const data = JSON.parse(fullResponse);
  handleActions(data.actions);
  speak(data.text);
} else {
  // Stream text directly to avatar
  streamToAvatar(response);
}`}
            </CodeBlock>
          </div>
        </div>
      </CollapsibleSection>

      {/* Media Hosting */}
      <CollapsibleSection title="Media Hosting" icon={<ExternalLink className="w-5 h-5" />}>
        <div className="space-y-4 text-sm">
          <p>
            A separate app hosts videos and images used in triggers and overlays:
          </p>
          
          <div className="p-3 rounded-lg bg-secondary border border-border">
            <a 
              href="https://frank-media-hosting-e34adbee1898.herokuapp.com/admin" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open Media Hosting Admin
            </a>
          </div>

          <h4 className="font-medium mt-4">Features</h4>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Drag-and-drop file upload</li>
            <li>Support for PNG, JPG, GIF, WebP, MP4, WebM</li>
            <li>Copy URL button for easy pasting into triggers</li>
            <li>Preview thumbnails</li>
            <li>100MB max file size</li>
          </ul>

          <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <p className="text-xs text-yellow-600 dark:text-yellow-400">
              <strong>Warning:</strong> Media files are stored on Heroku's ephemeral filesystem 
              and will be deleted when the dyno restarts. For production, consider using 
              persistent storage like AWS S3.
            </p>
          </div>
        </div>
      </CollapsibleSection>

      {/* Troubleshooting */}
      <CollapsibleSection title="Troubleshooting" icon={<MessageSquare className="w-5 h-5" />}>
        <div className="space-y-4 text-sm">
          <h4 className="font-medium">Video trigger not working?</h4>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Check the trigger is enabled (green dot)</li>
            <li>Verify keyword spelling matches what Deepgram transcribes</li>
            <li>Add keyword to boost list if speech recognition is inconsistent</li>
            <li>Check browser console for "Dynamic trigger found" logs</li>
            <li>Ensure video URL is accessible (test in new browser tab)</li>
          </ul>

          <h4 className="font-medium mt-4">Overlays not appearing?</h4>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Verify Agentforce is returning valid JSON</li>
            <li>Check the actions array structure matches expected format</li>
            <li>Ensure image/video URLs are publicly accessible</li>
            <li>Check browser console for parsing errors</li>
          </ul>

          <h4 className="font-medium mt-4">Speech recognition issues?</h4>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Increase utterance end delay if words are being cut off</li>
            <li>Add commonly misheard words to keyword boosts</li>
            <li>Check microphone permissions in browser</li>
            <li>Reduce background noise</li>
          </ul>
        </div>
      </CollapsibleSection>
    </div>
  );
};

export default HelpDocumentation;
