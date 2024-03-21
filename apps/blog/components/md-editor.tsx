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

export const uploadImg = async (file: any, username: string, signer: Signer): Promise<string> => {
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
  const buf = Buffer.concat([prefix, data as unknown as Uint8Array]);
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

  const response = await fetch(postUrl, { method: 'POST', body: formData });
  const resJSON = await response.json();
  return resJSON.url;

  // let retUrl = 'ret';
  // const xhr = new XMLHttpRequest();
  // console.log('before xhr open');
  // xhr.open('POST', postUrl);
  // xhr.onload = function () {
  //   console.log('onload');
  //   console.log(xhr.status, xhr.responseText);
  //   if (xhr.status === 200) {
  //     try {
  //       const res = JSON.parse(xhr.responseText);
  //       const { error } = res;
  //       if (error) {
  //         console.error('upload_error', error, xhr.responseText);
  //         // progress({ error: 'Error: ' + error });
  //         return;
  //       }

  //       const { url } = res;
  //       console.log('I am here and have this url', url, 'the same as retUrl', retUrl);
  //       // progress({ url });
  //     } catch (e) {
  //       console.error('upload_error2', 'not json', e, xhr.responseText);
  //       // progress({ error: 'Error: response not JSON' });
  //     }
  //   } else {
  //     console.error('upload_error3', xhr.status, xhr.statusText);
  //     // progress({ error: `Error: ${xhr.status}: ${xhr.statusText}` });
  //   }
  // };
  // xhr.onloadend = function () {
  //   console.log('onloadedend');
  // };
  // xhr.onerror = function (error) {
  //   console.error('xhr', file, error);
  //   // progress({ error: 'Unable to contact the server.' });
  // };
  // xhr.upload.onprogress = function (event) {
  //   if (event.lengthComputable) {
  //     const percent = Math.round((event.loaded / event.total) * 100);
  //     // progress({ message: `Uploading ${percent}%` });
  //   }
  // };
  // xhr.send(formData);
  // console.log('but after change retUrl what I have here', retUrl);
  // xhr.onreadystatechange = function () {
  //   if (xhr.readyState == 4 && xhr.status == 200) {
  //     const res = JSON.parse(xhr.responseText);
  //     const { url } = res;
  //     console.log('onreadystatechange res', res, 'url', url);
  //     retUrl = url;
  //   }
  // };
  // return retUrl;
};

export const onImageUpload = async (file: string, api: any, username: string, signer: Signer) => {
  const url = await uploadImg(file, username, signer);
  console.log('returned url', url);

  const insertedMarkdown = `**![handUpload](${url})**`;
  if (!insertedMarkdown) return;

  api.replaceSelection(insertedMarkdown);
};

export const onImageUpload_DnD = async (file: any, api: any, username: string, signer: Signer) => {
  // const url = await uploadImg(file);
  const url = await uploadImg(file, username, signer);
  console.log('url in onImageUpload_DnD', url);

  const insertedMarkdown = `**![${file.name}](${url})**`;
  console.log('insertedMarkdown before', insertedMarkdown);

  if (!insertedMarkdown) return;

  api.replaceSelection(insertedMarkdown);
  // setMarkdown((prev) => {
  //   console.log('prev markdown', prev);
  //   console.log('insertedMarkdown in SET', insertedMarkdown);
  //   return prev + insertedMarkdown;
  // });
};

export const onImageDrop = async (
  dataTransfer: { items: string | any[]; files: { item: (arg0: number) => any } },
  api: any,
  username: string,
  signer: Signer
) => {
  const files = [];

  for (let index = 0; index < dataTransfer.items.length; index++) {
    const file = dataTransfer.files.item(index);
    if (file) files.push(file);
  }
  console.log('files in onImageDrop', files);

  await Promise.all(files.map(async (file) => onImageUpload_DnD(file, api, username, signer)));
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
      await onImageDrop(event.dataTransfer, textApiRef.current, signer.username, signer);
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
            onChange={data.data.onChange}
            commands={[...(commands.getCommands() as any), imgBtn(inputRef, textApiRef)]}
            extraCommands={[]}
            //@ts-ignore
            style={{ '--color-canvas-default': 'var(--background)' }}
            onDrop={(event) => console.log('onDrop', event)}
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
