import MenuDetailsPage from "@/components/MenuDetailsPage";

export default function MenuDetailPage({ params }: { params: { id: string } }) {
  return <MenuDetailsPage id={params.id} />;
}
