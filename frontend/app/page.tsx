import { PageClient } from "@/app/page-client"
import { getHistoric } from "@/lib/api"

export default async function Page() {
  const historic = await getHistoric()
  return <PageClient historic={historic} />
}
