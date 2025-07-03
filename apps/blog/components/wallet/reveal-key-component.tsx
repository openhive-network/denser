import { Input, Label } from '@ui/components';
import { useQRCode } from 'next-qrcode';
import PasswordDialog from './password-dialog';

const RevealKeyComponent = ({
  reveal,
  keyValue,
  onReveal,
  title,
  mockValue,
  type
}: {
  reveal: boolean;
  keyValue: string;
  onReveal: (password: string) => void;
  title: string;
  mockValue: string;
  type: 'posting' | 'active' | 'owner' | 'memo';
}) => {
  const { Canvas } = useQRCode();
  return (
    <div className="flex flex-col">
      <Label htmlFor={type} className="text-lg font-semibold">
        {title}
      </Label>
      <div className="relative h-10">
        <Input
          className="absolute left-0 h-full"
          type={reveal && keyValue !== mockValue ? 'input' : 'password'}
          id={type}
          value={keyValue}
        />
        {reveal ? null : (
          <PasswordDialog onReveal={(password) => onReveal(password)} keysUploaded={keyValue !== mockValue} />
        )}
      </div>
      {reveal ? (
        <div className="self-end pt-2">
          <Canvas
            text={keyValue}
            options={{
              errorCorrectionLevel: 'M',
              margin: 3,
              scale: 4,
              width: 100
            }}
          />
        </div>
      ) : null}
    </div>
  );
};

export default RevealKeyComponent;
