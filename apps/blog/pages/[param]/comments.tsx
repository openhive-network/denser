import UserPosts from './posts';
import { GetServerSideProps } from 'next';
import { getDefaultProps } from '../../lib/get-translations';

export const getServerSideProps: GetServerSideProps = getDefaultProps;

export default UserPosts;
