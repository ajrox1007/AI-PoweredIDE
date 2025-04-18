import { FC } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { useFileSystemStore } from '@/store/fileSystemStore';
import { useAiStore } from '@/store/aiStore';

const StatusBar: FC = () => {
  const { editorPosition } = useEditorStore();
  const { activeFile } = useFileSystemStore();
  const { aiStatus } = useAiStore();

  return (
    <footer className="h-6 bg-primary text-white px-3 flex items-center justify-between text-xs">
      <div className="flex items-center">
        <span className="inline-flex items-center mr-3">
          <span className="material-icons text-[14px] mr-1">source</span>
          <span>main</span>
        </span>
        <span>{activeFile?.language || 'No file'}</span>
      </div>
      
      <div className="flex items-center">
        <span className="mr-3">
          Ln {editorPosition?.lineNumber || 0}, Col {editorPosition?.column || 0}
        </span>
        <span className="mr-3">Spaces: 2</span>
        <span className="mr-3">UTF-8</span>
        <span>AI: {aiStatus}</span>
      </div>
    </footer>
  );
};

export default StatusBar;
