import env from '@beam-australia/react-env';
import { Signer } from '@smart-signer/lib/signer/signer';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

const readFileAsBuffer = (file: File): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      try {
        const result = Buffer.from(reader.result!.toString(), 'binary');
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
    reader.addEventListener('error', () => reject(reader.error));
    reader.readAsBinaryString(file);
  });
};

const createImageSignature = async (file: File, signer: Signer): Promise<string> => {
  const data = await readFileAsBuffer(file);
  const prefix = Buffer.from('ImageSigningChallenge');
  // @ts-ignore-next-line
  const buf = Buffer.concat([prefix, data]);

  return signer.signChallenge({
    message: buf,
    password: ''
  });
};

const uploadImg = async (file: File, username: string, signer: Signer): Promise<string> => {
  try {
    const [sig, formData] = await Promise.all([
      createImageSignature(file, signer),
      Promise.resolve(
        (() => {
          const fd = new FormData();
          fd.append('file', file);
          return fd;
        })()
      )
    ]);

    const postUrl = `${env('IMAGES_ENDPOINT')}${username}/${sig}`;
    const response = await fetch(postUrl, { method: 'POST', body: formData });

    if (!response.ok) {
      throw new Error(`Upload failed with status: ${response.status}`);
    }

    const resJSON = await response.json();
    return resJSON.url;
  } catch (error) {
    logger.error('Error when uploading file %s: %o', file.name, error);
    return '';
  }
};

const extractFilesFromDataTransfer = (dataTransfer: DataTransfer): File[] => {
  const files: File[] = [];
  for (let index = 0; index < dataTransfer.items.length; index++) {
    const file = dataTransfer.files.item(index);
    if (file) files.push(file);
  }
  return files;
};

const uploadFilesAndGenerateMarkdown = async (
  files: File[],
  username: string,
  signer: Signer
): Promise<string> => {
  if (!files.length || !username || !signer) {
    return '';
  }

  const uploadPromises = files.map((file) => uploadImg(file, username, signer));
  const urls = await Promise.all(uploadPromises);

  const imageMarkdown = urls
    .filter((url) => url)
    .map((url) => ` ![image](${url}) `)
    .join('');

  if (!imageMarkdown) {
    logger.error('Failed to upload images');
  }

  return imageMarkdown;
};
const insertToTextArea = (insertString: string, currentText: string) => {
  // Instead of manipulating the DOM directly, we'll work with the text state
  // and let React handle the editor updates through the onChange callback

  // Try to get cursor position from CodeMirror if available
  const editorElement = document.querySelector('.cm-content[contenteditable="true"]');
  let insertPosition = currentText.length; // Default to end of text

  if (editorElement) {
    const cmEditor = (editorElement as any).cmView?.view;
    if (cmEditor?.state?.selection?.main) {
      insertPosition = cmEditor.state.selection.main.from;
    }
  }

  // Insert the string at the cursor position
  const before = currentText.slice(0, insertPosition);
  const after = currentText.slice(insertPosition);

  return before + insertString + after;
};

export const handleImageUpload = async (
  files: File[],
  username: string,
  signer: Signer,
  onChange: (text: string) => void,
  text: string
) => {
  const imageMarkdown = await uploadFilesAndGenerateMarkdown(files, username, signer);
  if (imageMarkdown) {
    const newContent = insertToTextArea(imageMarkdown, text);
    onChange(newContent);
  }
};

export const dropHandler = async (
  username: string,
  signer: Signer,
  event: DragEvent,
  onChange: (text: string) => void,
  text: string
) => {
  event.preventDefault();
  event.stopPropagation();

  if (!event.dataTransfer) return;

  const files = extractFilesFromDataTransfer(event.dataTransfer);
  const imageMarkdown = await uploadFilesAndGenerateMarkdown(files, username, signer);

  if (imageMarkdown) {
    const newContent = insertToTextArea(imageMarkdown, text);
    onChange(newContent);
  }
};
