import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { GetServerSideProps } from 'next';
import { i18n } from '@/blog/next-i18next.config';
import '@uiw/react-md-editor/markdown-editor.css';
import dynamic from 'next/dynamic';
import { useCallback, useRef, useState } from 'react';

import * as commands from '@uiw/react-md-editor/commands';
import { useTheme } from 'next-themes';
import useUser from '../components/hooks/use-user';
// import HiveAuthUtils from '../lib/hive-auth-utils';
// import { Signature, cryptoUtils } from '@hiveio/dhive';

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

export const uploadImg = () =>
  'https://images.unsplash.com/photo-1689671439720-47c45b6a7a74?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxlZGl0b3JpYWwtZmVlZHw1fHx8ZW58MHx8fHx8&auto=format&fit=crop&w=500&q=60';

export const onImageUpload = async (file, api) => {
  const url = await uploadImg(file);

  const insertedMarkdown =
    `**![](${url})**` +
    `<!--rehype:style=display: flex; justify-content: center; width: 100%; max-width: 500px; margin: auto; margin-top: 4px; margin-bottom: 4px; -->`;
  if (!insertedMarkdown) return;

  api.replaceSelection(insertedMarkdown);
};

export const onImageUpload_DnD = async (file, setMarkdown) => {
  const url = await uploadImg(file);

  const insertedMarkdown =
    `**![](${url})**` +
    `<!--rehype:style=display: flex; justify-content: center; width: 100%; max-width: 500px; margin: auto; margin-top: 4px; margin-bottom: 4px; -->`;
  if (!insertedMarkdown) return;

  setMarkdown((prev) => prev + insertedMarkdown);
};

export const onImageDrop = async (dataTransfer, setMarkdown) => {
  const files = [];

  for (let index = 0; index < dataTransfer.items.length; index++) {
    const file = dataTransfer.files.item(index);
    if (file) files.push(file);
  }

  await Promise.all(files.map(async (file) => onImageUpload_DnD(file, setMarkdown)));
};

function Submit() {
  const { user } = useUser({
    redirectTo: '',
    redirectIfFound: true
  });
  const [value, setValue] = useState('**Hello world!!!**');
  const { resolvedTheme } = useTheme();

  const inputRef = useRef(null);
  const editorRef = useRef(null);
  const textApiRef = useRef(null);
  const [isDrag, setIsDrag] = useState(false);
  const [insertImg, setInsertImg] = useState('');

  const inputImageHandler = useCallback(async (event) => {
    if (event.target.files && event.target.files.length === 1) {
      setInsertImg('');
      await onImageUpload(event.target.files[0], textApiRef.current);
    }
  }, []);

  // Drag and Drop
  const startDragHandler = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.type === 'dragenter') setIsDrag(true);
  };

  const dragHandler = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.type === 'dragenter' || event.type === 'dragover') {
      setIsDrag(true);
    } else if (event.type === 'dragleave') setIsDrag(false);
  };

  const dropHandler = useCallback(async (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDrag(false);
    await onImageDrop(event.dataTransfer, setValue);
  }, []);

  const imgBtn = (inputRef, textApiRef) => ({
    name: 'Text To Image',
    keyCommand: 'text2image',
    render: (command, disabled, executeCommand) => {
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
    execute: (state, api) => {
      inputRef.current.click();
      textApiRef.current = api;
    }
  });

  const editChoice = (inputRef, textApiRef) => [imgBtn(inputRef, textApiRef)];

  return (
    <div className="px-4 py-8">
      <div
        className="block bg-green-50 px-4 py-6 text-sm font-light shadow-sm dark:bg-slate-800"
        data-testid="log-in-to-make-post-message"
      >
        Log in to make a post.
      </div>
      <>
        <input
          ref={inputRef}
          className="hidden"
          type="file"
          accept=".jpg,.png,.jpeg,.jfif,.gif"
          name="avatar"
          value={insertImg}
          onChange={inputImageHandler}
        />
        <div onDragEnter={startDragHandler} className="relative">
          <div data-color-mode={resolvedTheme === 'dark' ? 'dark' : 'light'}>
            <MDEditor
              ref={editorRef}
              value={value}
              onChange={setValue}
              commands={[...(commands.getCommands() as any), imgBtn(inputRef, textApiRef)]}
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
      </>
    </div>
  );
}

export default Submit;

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  return {
    props: {
      ...(await serverSideTranslations(req.cookies.NEXT_LOCALE! || i18n.defaultLocale, ['common_blog']))
    }
  };
};

// function uploadImage({ user, payload: { file, dataUrl, filename = 'image.txt' } }) {
// // eslint-disable-next-line no-underscore-dangle
// const _progress = progress;
// progress = (msg) => {
//   _progress(msg);
// };

// const stateUser = yield select((state) => state.user);
// const username = stateUser.getIn(['current', 'username']);
// const keychainLogin = isLoggedInWithKeychain();
// const hiveSignerLogin = isLoggedInWithHiveSigner();
// const hiveAuthLogin = HiveAuthUtils.isLoggedInWithHiveAuth();

// const d = stateUser.getIn(['current', 'private_keys', 'posting_private']);
// if (!username) {
//   progress({ error: 'Please login first.' });
//   return;
// }

// if (!(keychainLogin || hiveSignerLogin || hiveAuthLogin || d)) {
//   progress({ error: 'Login with your posting key' });
//   return;
// }

// if (!file && !dataUrl) {
//   console.error('uploadImage required: file or dataUrl');
//   return;
// }

// let data, dataBs64;
// if (file) {
//   // drag and drop
//   const reader = new FileReader();
//   data = yield new Promise((resolve) => {
//     reader.addEventListener('load', () => {
//       const result = Buffer.from(reader.result, 'binary');
//       resolve(result);
//     });
//     reader.readAsBinaryString(file);
//   });
// } else {
//   // recover from preview
//   const commaIdx = dataUrl.indexOf(',');
//   dataBs64 = dataUrl.substring(commaIdx + 1);
//   data = Buffer.from(dataBs64, 'base64');
// }

// // The challenge needs to be prefixed with a constant (both on the server and checked on the client) to make sure the server can't easily make the client sign a transaction doing something else.
// const prefix = Buffer.from('ImageSigningChallenge');
// const buf = Buffer.concat([prefix, data]);
// const bufSha = cryptoUtils.sha256(buf);

// const formData = new FormData();
// if (file) {
//   formData.append('file', file);
// } else {
//   // formData.append('file', file, filename) <- Failed to add filename=xxx to Content-Disposition
//   // Can't easily make this look like a file so this relies on the server supporting: filename and filebinary
//   formData.append('filename', filename);
//   formData.append('filebase64', dataBs64);
// }

// let sig;
// let postUrl;
// if (user?.isLoggedIn === true) {
//   // verify user with access_token for HiveSigner login
//   postUrl = `${$STM_Config.upload_image}/hs/${hiveSignerClient.accessToken}`;
// } else if (keychainLogin) {
//   const response = yield new Promise((resolve) => {
//     window.hive_keychain.requestSignBuffer(username, JSON.stringify(buf), 'Posting', (res) => {
//       resolve(res);
//     });
//   });
//   if (response.success) {
//     sig = response.result;
//     postUrl = `${$STM_Config.upload_image}/${username}/${sig}`;
//   } else {
//     progress({ error: response.message });
//     return;
//   }
// } else if (hiveAuthLogin) {
//   yield put(userActions.showHiveAuthModal());
//   const dataSha256 = Buffer.from(hash.sha256(data));
//   const checksumBuf = Buffer.concat([prefix, dataSha256]);
//   const response = yield new Promise((resolve) => {
//     HiveAuthUtils.signChallenge(JSON.stringify(checksumBuf, null, 0), 'posting', (res) => {
//       resolve(res);
//     });
//   });

//   yield put(userActions.hideHiveAuthModal());
//   if (response.success) {
//     sig = response.result;
//   } else {
//     progress({ error: response.error });
//     return;
//   }
//   postUrl = `${$STM_Config.upload_image}/cs/${username}/${sig}`;
// } else {
//   sig = Signature.signBufferSha256(bufSha, d).toHex();
//   postUrl = `${$STM_Config.upload_image}/${username}/${sig}`;
// }
// sig = Signature.signBufferSha256(bufSha, d).toHex();

//   function toHexString(sig) {
//     if (sig === null) {
//       return null;
//     }
//     if (isNaN(sig)) {
//       return sig;
//     }
//     var num; /*from  w  w w.  ja v  a  2  s  .  co  m*/
//     var hex;
//     if (sig < 0) {
//       num = 0xffffffff + sig + 1;
//     } else {
//       num = sig;
//     }
//     hex = num.toString(16).toUpperCase();
//     return '0x' + ('00000000'.substr(0, 8 - hex.length) + hex);
//   }

//   sig = Signature.fromBuffer(bufSha);
//   sig = toHexString(sig);
//   console.log('sig', sig);
//   postUrl = `https://images.hive.blog/@calcifero/${sig}`;

//   const xhr = new XMLHttpRequest();
//   xhr.open('POST', postUrl);
//   xhr.onload = function () {
//     console.log(xhr.status, xhr.responseText);
//     if (xhr.status === 200) {
//       try {
//         const res = JSON.parse(xhr.responseText);
//         const { error } = res;
//         if (error) {
//           console.error('upload_error', error, xhr.responseText);
//           progress({ error: 'Error: ' + error });
//           return;
//         }

//         const { url } = res;
//         progress({ url });
//       } catch (e) {
//         console.error('upload_error2', 'not json', e, xhr.responseText);
//         progress({ error: 'Error: response not JSON' });
//       }
//     } else {
//       console.error('upload_error3', xhr.status, xhr.statusText);
//       progress({ error: `Error: ${xhr.status}: ${xhr.statusText}` });
//     }
//   };
//   xhr.onerror = function (error) {
//     console.error('xhr', filename, error);
//     progress({ error: 'Unable to contact the server.' });
//   };
//   xhr.upload.onprogress = function (event) {
//     if (event.lengthComputable) {
//       const percent = Math.round((event.loaded / event.total) * 100);
//       progress({ message: `Uploading ${percent}%` });
//     }
//   };
//   xhr.send(formData);
// }
