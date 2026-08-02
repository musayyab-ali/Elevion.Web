import { redirect } from "next/navigation";

export default function BlogDefaultPage() {
  redirect("/blog/list");
}
