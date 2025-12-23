import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, AlertTriangle } from 'lucide-react';

interface DeleteBabyDialogProps {
  babyId: string;
  babyName: string;
}

const DeleteBabyDialog: React.FC<DeleteBabyDialogProps> = ({ babyId, babyName }) => {
  const { user } = useAuth();
  const { deleteBaby } = useData();
  const navigate = useNavigate();
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [open, setOpen] = useState(false);

  // Only doctors can delete babies
  const canDelete = user?.role === 'doctor' || user?.role === 'senior_doctor';

  if (!canDelete) {
    return null;
  }

  const handleDelete = async () => {
    if (confirmText !== babyName) {
      toast.error('Please type the baby name correctly to confirm deletion');
      return;
    }

    setIsDeleting(true);
    try {
      await deleteBaby(babyId);
      toast.success(`${babyName} has been removed from the system`);
      setOpen(false);
      navigate('/dashboard');
    } catch (error) {
      console.error('Error deleting baby:', error);
      toast.error('Failed to delete baby record');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button 
          variant="outline" 
          className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
          Remove Baby
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-3 text-destructive">
            <div className="p-2 rounded-xl bg-destructive/10">
              <AlertTriangle className="w-5 h-5" />
            </div>
            Remove Baby Record
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4 pt-4">
            <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20">
              <p className="font-medium text-foreground">
                This action cannot be undone. This will permanently delete:
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                <li>• All vital signs data for {babyName}</li>
                <li>• All alert history</li>
                <li>• All alert recipient configurations</li>
                <li>• The baby record from the system</li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                Type <span className="font-bold text-destructive">"{babyName}"</span> to confirm:
              </p>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type baby name to confirm"
                className="border-destructive/30 focus:border-destructive"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={confirmText !== babyName || isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Removing...' : 'Yes, Remove Baby'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteBabyDialog;