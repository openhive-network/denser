import { Layout } from '@/components/layout';
import LayoutProfile from '@/components/layout-profile';
export default function Username() {
  return (
    <span>USERNAME PAGE</span>
  )
}

Username.getLayout = function getLayout(page) {
  return (
    <Layout>
      <LayoutProfile>{page}</LayoutProfile>
    </Layout>
  )
}
