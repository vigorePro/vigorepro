import { redirect } from 'next/navigation'

interface HomeProps {
  searchParams: { slug?: string }
}

export default function Home({ searchParams }: HomeProps) {
  const slug = searchParams.slug
  if (slug) {
    redirect(`/cardapio?slug=${slug}`)
  }
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold text-center">
        VigorePro
      </h1>
      <p className="mt-4 text-xl text-gray-600 text-center">
        SaaS de atendimento por IA para food service
      </p>
    </main>
  )
}
