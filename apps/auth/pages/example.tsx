import { useQuery } from '@tanstack/react-query';
import fetchJson, { FetchError }  from '../lib/fetchJson';

export default function ExamplePage() {
    const { isLoading, error, data } = useQuery({
        queryKey: ['repoData'],
        queryFn: async () => {
            try {
                return await fetchJson('https://api.github.com/repos/TanStack/query');
            } catch (error) {
                if (error instanceof FetchError) {
                    console.error(error, error.response);
                } else {
                    console.error('An unexpected error happened:', error)
                }
                throw(error);
            }
        },
        retry: 1,
    })

    if (isLoading) return 'Loading...'

    if (error) return 'An error has occurred: ' + error?.message

    console.log('bamboo data', data);
    return (
        <div>
            <h1>{data.name}</h1>
            <p>{data.description}</p>
            <strong>👀 {data.subscribers_count}</strong>{' '}
            <strong>✨ {data.stargazers_count}</strong>{' '}
            <strong>🍴 {data.forks_count}</strong>
        </div>
    )
}
