import UserPosts from './posts';
import { GetServerSideProps } from 'next';
import { getServerSidePropsDefault } from '../../lib/get-translations';

export const getServerSideProps: GetServerSideProps = getServerSidePropsDefault;

export default UserPosts;
