import { FC } from 'react';

interface AppHeaderProps {
  title: string;
}

const AppHeader: FC<AppHeaderProps> = ({ title }) => {
  return (
    <header className="h-9 bg-sidebar border-b border-editor-border flex items-center px-3 text-sm">
      <div className="flex items-center">
        <span className="material-icons text-primary mr-2 text-lg">code</span>
        <span className="font-medium">{title}</span>
      </div>
      <div className="flex items-center ml-auto gap-2">
        <button className="p-1 rounded hover:bg-accent/10">
          <span className="material-icons text-sm">account_circle</span>
        </button>
        <button className="p-1 rounded hover:bg-accent/10">
          <span className="material-icons text-sm">settings</span>
        </button>
      </div>
    </header>
  );
};

export default AppHeader;
