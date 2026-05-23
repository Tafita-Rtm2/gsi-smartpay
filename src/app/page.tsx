"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

const filieres = [
  { id: 1, name: "Tourisme, Voyage & Hôtellerie", type: "BTS" },
  { id: 2, name: "Droit & Techniques des Affaires", type: "BTS" },
  { id: 3, name: "Bâtiment & Travaux Publics", type: "BTS" },
  { id: 4, name: "Informatique de Gestion", type: "BTS" },
  { id: 5, name: "Management des Affaires", type: "BTS" },
  { id: 6, name: "Multimédia, Communication & Journalisme", type: "BTS" },
  { id: 7, name: "Entrepreneur du BTP (EBTP)", type: "LICENCE" },
  { id: 8, name: "Marketing digital & Création de Contenus (MDC)", type: "LICENCE" },
  { id: 9, name: "Management des Entreprises (MAE)", type: "LICENCE" },
  { id: 10, name: "Multimédia, Communication & Journalisme (MCJ)", type: "LICENCE" },
  { id: 11, name: "Informatique de Gestion, Électronique et Télécommunication (IGET)", type: "LICENCE" },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-red-700 text-white p-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
          <div className="bg-white p-1 rounded">
             <span className="text-red-700 font-bold text-xl">GSI</span>
          </div>
          <h1 className="text-xl font-bold uppercase tracking-wider">Formation Initiale Présentiel</h1>
        </div>
        <div className="flex gap-4">
          <Link href="/nina" className="text-sm bg-black/20 px-3 py-1 rounded">Admin</Link>
          <Link href="/prof-add" className="text-sm bg-black/20 px-3 py-1 rounded">Personnel</Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative h-[300px] flex items-center justify-center bg-gray-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-red-800/80 to-transparent z-10"></div>
        <div className="relative z-20 text-center px-4">
          <h2 className="text-4xl md:text-6xl font-black mb-4 uppercase">Excellence Académique</h2>
          <p className="text-xl max-w-2xl mx-auto">Visez le monde à moindre coût ! Des formations reconnues au niveau international.</p>
        </div>
      </section>

      {/* Filières */}
      <section className="max-w-6xl mx-auto py-12 px-4">
        <h3 className="text-3xl font-bold text-center mb-12 text-gray-800 border-b-4 border-red-600 inline-block mx-auto">Nos Filières</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
          {/* BTS Section */}
          <div className="bg-blue-50 p-6 rounded-2xl border-l-8 border-blue-600 shadow-sm">
            <h4 className="text-2xl font-bold text-blue-800 mb-6 flex items-center gap-2">
              <span className="bg-blue-600 text-white p-1 rounded">BTS</span> Brevet Technicien Supérieur
            </h4>
            <ul className="space-y-3">
              {filieres.filter(f => f.type === 'BTS').map(f => (
                <li key={f.id}>
                  <Link href={`/login?filiere=${f.id}`} className="block p-3 bg-white hover:bg-blue-600 hover:text-white transition rounded-lg border border-blue-100 shadow-sm font-medium">
                    {f.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Licence Section */}
          <div className="bg-yellow-50 p-6 rounded-2xl border-l-8 border-yellow-600 shadow-sm">
            <h4 className="text-2xl font-bold text-yellow-800 mb-6 flex items-center gap-2">
              <span className="bg-yellow-600 text-white p-1 rounded">L3</span> Diplôme Licence Professionnelle
            </h4>
            <ul className="space-y-3">
              {filieres.filter(f => f.type === 'LICENCE').map(f => (
                <li key={f.id}>
                  <Link href={`/login?filiere=${f.id}`} className="block p-3 bg-white hover:bg-yellow-600 hover:text-white transition rounded-lg border border-yellow-100 shadow-sm font-medium">
                    {f.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Info Section */}
      <section className="bg-gray-50 py-12">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="p-6 bg-white rounded-xl shadow-md">
                <div className="text-red-600 text-4xl mb-4">🏆</div>
                <h5 className="font-bold text-lg">Reconnue par l'État</h5>
                <p className="text-gray-600 mt-2">Habilitée par le Ministère de l'Enseignement Supérieur</p>
            </div>
            <div className="p-6 bg-white rounded-xl shadow-md">
                <div className="text-red-600 text-4xl mb-4">🌍</div>
                <h5 className="font-bold text-lg">International</h5>
                <p className="text-gray-600 mt-2">Partenaires mondiaux (Canada, USA, Europe)</p>
            </div>
            <div className="p-6 bg-white rounded-xl shadow-md">
                <div className="text-red-600 text-4xl mb-4">💰</div>
                <h5 className="font-bold text-lg">Accessible</h5>
                <p className="text-gray-600 mt-2">Le meilleur rapport qualité-prix à Madagascar</p>
            </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-red-800 text-white py-8 px-4 mt-12">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
          <div>
            <h6 className="font-bold text-xl mb-2">GSI INTERNATIONALE</h6>
            <p>Savoir, c'est pouvoir.</p>
          </div>
          <div className="space-y-1">
             <p>📞 034 64 272 51 | 038 46 457 25</p>
             <p>📍 Madagascar</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
