import Link from "next/link";

export default function NoEncontrada() {
  return (
    <main className="contenedor py-20 text-center">
      <h1 className="text-2xl font-bold">No encontramos esta página</h1>
      <p className="mt-2">Puede que el enlace haya cambiado.</p>
      <Link href="/" className="btn-primario mt-6">Ir a la tienda</Link>
    </main>
  );
}
