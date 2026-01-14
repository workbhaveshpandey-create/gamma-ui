import {
    PanelLeftClose,
    RotateCcw,
    Camera,
    StopCircle,
    RefreshCcw,
    X,
    Save,
    Plus,
    MessageSquare,
    Settings,
    ChevronRight,
    Send,
    Image,
    Mic,
    Paperclip,
    ArrowUp,
    Globe
} from 'lucide-react';

const icons = {
    PanelLeftClose,
    RotateCcw,
    Camera,
    StopCircle,
    RefreshCcw,
    X,
    Save,
    Plus,
    MessageSquare,
    Settings,
    ChevronRight,
    Send,
    Image,
    Mic,
    Paperclip,
    ArrowUp,
    Globe
};

Object.entries(icons).forEach(([name, component]) => {
    console.log(`${name}: ${component ? 'Exists' : 'MISSING'}`);
});
