import '@uiw/react-md-editor/markdown-editor.css';
import dynamic from 'next/dynamic';
import {
  ChangeEvent,
  Dispatch,
  MutableRefObject,
  SetStateAction,
  useCallback,
  useRef,
  useState
} from 'react';
import * as commands from '@uiw/react-md-editor/commands';
import { useTheme } from 'next-themes';
import { ContextStore } from '@uiw/react-md-editor';
import env from '@beam-australia/react-env';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { cryptoUtils } from '@hiveio/dhive';
import { getSigner } from '@smart-signer/lib/signer/get-signer';
import { KeyType, LoginType } from '@smart-signer/types/common';
import { Signer, SignerOptions } from '@smart-signer/lib/signer/signer';

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

export const uploadImg = async (file: any, username: string, signer: Signer) => {
  let data, dataBs64;
  if (file) {
    // drag and drop
    const reader = new FileReader();
    data = new Promise((resolve) => {
      reader.addEventListener('load', () => {
        const result = Buffer.from(reader.result, 'binary');
        resolve(result);
      });
      reader.readAsBinaryString(file);
    });
  }

  // The challenge needs to be prefixed with a constant (both on the server and checked on the client) to make sure the server can't easily make the client sign a transaction doing something else.
  // const prefix = Buffer.from('ImageSigningChallenge');
  // const buf = Buffer.concat([prefix, data]);
  // const bufSha = hash.sha256(buf);

  const formData = new FormData();
  if (file) {
    formData.append('file', file);
  }

  data = await data;
  const prefix = Buffer.from('ImageSigningChallenge');
  const buf = Buffer.concat([prefix, data]);
  const bufSha = cryptoUtils.sha256(buf);

  let sig;
  let postUrl;
  console.log('bufSha', bufSha);

  sig = await signer.signChallenge({
    message: buf,
    password: ''
  });

  console.log('sig', sig);

  postUrl = `${env('IMAGES_ENDPOINT')}${username}/${sig}`;

  const xhr = new XMLHttpRequest();
  xhr.open('POST', postUrl);
  xhr.onload = function () {
    console.log(xhr.status, xhr.responseText);
    if (xhr.status === 200) {
      try {
        const res = JSON.parse(xhr.responseText);
        const { error } = res;
        if (error) {
          console.error('upload_error', error, xhr.responseText);
          // progress({ error: 'Error: ' + error });
          return;
        }

        const { url } = res;
        // progress({ url });
      } catch (e) {
        console.error('upload_error2', 'not json', e, xhr.responseText);
        // progress({ error: 'Error: response not JSON' });
      }
    } else {
      console.error('upload_error3', xhr.status, xhr.statusText);
      // progress({ error: `Error: ${xhr.status}: ${xhr.statusText}` });
    }
  };
  xhr.onerror = function (error) {
    console.error('xhr', filename, error);
    // progress({ error: 'Unable to contact the server.' });
  };
  xhr.upload.onprogress = function (event) {
    if (event.lengthComputable) {
      const percent = Math.round((event.loaded / event.total) * 100);
      // progress({ message: `Uploading ${percent}%` });
    }
  };
  xhr.send(formData);
  console.log('xhr.response', xhr.response);
};

export const onImageUpload = async (file: string, api: any, username: string, signer: Signer) => {
  const url = await uploadImg(file, username, signer);

  const insertedMarkdown = `**![nazwa](${url})**`;
  if (!insertedMarkdown) return;

  api.replaceSelection(insertedMarkdown);
};

export const onImageUpload_DnD = async (
  file: any,
  setMarkdown: { (value: SetStateAction<string>): void; (arg0: (prev: any) => string): void },
  username: string
) => {
  // const url = await uploadImg(file);
  const url = await uploadImg(file, username);

  const insertedMarkdown = `**![](${url})**`;
  if (!insertedMarkdown) return;

  setMarkdown((prev) => prev + insertedMarkdown);
};

export const onImageDrop = async (
  dataTransfer: { items: string | any[]; files: { item: (arg0: number) => any } },
  setMarkdown: Dispatch<SetStateAction<string>>
) => {
  const files = [];

  for (let index = 0; index < dataTransfer.items.length; index++) {
    const file = dataTransfer.files.item(index);
    if (file) files.push(file);
  }

  await Promise.all(files.map(async (file) => onImageUpload_DnD(file, setMarkdown)));
};

const MdEditor = (data: {
  data: {
    value: string | undefined;
    onChange:
      | ((
          value?: string | undefined,
          event?: ChangeEvent<HTMLTextAreaElement> | undefined,
          state?: ContextStore | undefined
        ) => void)
      | undefined;
  };
}) => {
  const { user } = useUser();

  const { resolvedTheme } = useTheme();
  const signerOptions: SignerOptions = {
    username: user.username,
    loginType: user.loginType,
    keyType: KeyType.posting,
    apiEndpoint: 'https://api.hive.blog',
    storageType: 'localStorage'
  };
  const signer = getSigner(signerOptions);

  const inputRef = useRef(null);
  const editorRef = useRef(null);
  const textApiRef = useRef(null);
  const [isDrag, setIsDrag] = useState(false);
  const [insertImg, setInsertImg] = useState('');

  const inputImageHandler = useCallback(async (event: { target: { files: string | any[] } }) => {
    if (event.target.files && event.target.files.length === 1) {
      setInsertImg('');
      await onImageUpload(event.target.files[0], textApiRef.current, user.username, signer);
    }
  }, []);

  // Drag and Drop
  const startDragHandler = (event: {
    preventDefault: () => void;
    stopPropagation: () => void;
    type: string;
  }) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.type === 'dragenter') setIsDrag(true);
  };

  const dragHandler = (event: { preventDefault: () => void; stopPropagation: () => void; type: string }) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.type === 'dragenter' || event.type === 'dragover') {
      setIsDrag(true);
    } else if (event.type === 'dragleave') setIsDrag(false);
  };

  const dropHandler = useCallback(
    async (event: { preventDefault: () => void; stopPropagation: () => void; dataTransfer: any }) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDrag(false);
      await onImageDrop(event.dataTransfer, () => data.data.onChange);
    },
    []
  );

  const imgBtn = (inputRef: any, textApiRef: MutableRefObject<null>) => ({
    name: 'Text To Image',
    keyCommand: 'text2image',
    render: (
      command: commands.ICommand,
      disabled: boolean | undefined,
      executeCommand: (arg0: commands.ICommand<string>, arg1: string | undefined) => void
    ) => {
      return (
        <button
          type="button"
          aria-label="Insert title3"
          disabled={disabled}
          onClick={() => {
            executeCommand(command, command.groupName);
          }}
        >
          <svg width="12" height="12" viewBox="0 0 20 20">
            <path
              fill="currentColor"
              d="M15 9c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm4-7H1c-.55 0-1 .45-1 1v14c0 .55.45 1 1 1h18c.55 0 1-.45 1-1V3c0-.55-.45-1-1-1zm-1 13l-6-5-2 2-4-5-4 8V4h16v11z"
            ></path>
          </svg>
        </button>
      );
    },
    execute: (state: any, api: null) => {
      inputRef.current.click();
      textApiRef.current = api;
    }
  });

  const editChoice = (inputRef: MutableRefObject<null>, textApiRef: MutableRefObject<null>) => [
    imgBtn(inputRef, textApiRef)
  ];

  return (
    <div>
      <input
        ref={inputRef}
        className="hidden"
        type="file"
        accept=".jpg,.png,.jpeg,.jfif,.gif"
        name="avatar"
        value={insertImg}
        //@ts-ignore
        onChange={inputImageHandler}
      />
      <div onDragEnter={startDragHandler} className="relative">
        <div>
          <MDEditor
            ref={editorRef}
            preview="edit"
            value={data.data.value}
            //@ts-ignore
            onChange={data.data.onChange}
            commands={[...(commands.getCommands() as any), imgBtn(inputRef, textApiRef)]}
            extraCommands={[]}
            //@ts-ignore
            style={{ '--color-canvas-default': 'var(--background)' }}
          />
        </div>
        {isDrag && (
          <div
            className="absolute bottom-0 left-0 right-0 top-0 h-full w-full bg-red-400 bg-opacity-20 "
            onDrop={dropHandler}
            onDragEnter={dragHandler}
            onDragOver={dragHandler}
            onDragLeave={dragHandler}
          ></div>
        )}
      </div>
    </div>
  );
};

export default MdEditor;
