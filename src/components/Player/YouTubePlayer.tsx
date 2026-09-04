interface YouTubePlayerProps {
  containerId: string;
}

export default function YouTubePlayer({ containerId }: YouTubePlayerProps) {
  return (
    <div className="w-full aspect-video bg-black rounded-md overflow-hidden shadow-2xl">
      <div id={containerId} className="w-full h-full" />
    </div>
  );
}
