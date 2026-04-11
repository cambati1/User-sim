import { useParams } from 'react-router-dom'
export default function ReviewPage() {
  const { id } = useParams()
  return <div className="p-8 text-gray-900">Review Page for {id} — coming soon</div>
}
