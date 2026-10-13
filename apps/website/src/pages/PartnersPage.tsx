import { useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import SEO from "@/components/SEO";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { useMovementTotals } from "@shared/hooks/useMovementTotals";
import { ExternalLink, Search } from "lucide-react";

interface Partner {
  name: string;
  /** A filename served from /partners/, or a full https:// URL (e.g. a Wikimedia hotlink). */
  logo?: string;
  /** Some logos need a dark tile instead of the default white one to stay legible (e.g. a white-on-transparent mark). */
  dark?: boolean;
  /** Bare domain, e.g. "jaworldwide.org" — rendered as a link to https://<website>. */
  website?: string;
  /** A title/role line shown above the website link, e.g. "Mayor: Jane Doe" or a civic leader's role — also stands alone when there's no logo. */
  role?: string;
}

interface Pillar {
  id: string;
  n: string;
  tag: string;
  name: string;
  description: string;
  partners: Partner[];
}

// Mayor, official website, and coat of arms for each municipality, from
// the "PR Municipalities Complete Directory V2" sheet. Most logos are
// wikimedia.org or the town's own .gov site; a minority are
// encrypted-tbn0.gstatic.com (Google Images cache) or similar
// third-party hosts, used here by explicit request even though they can
// silently expire — swap those for an official source as one's found.
const PR_MUNICIPALITIES: Partner[] = [
  { name: "Adjuntas", logo: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/75/Escudo_de_Adjuntas%2C_Puerto_Rico.svg/1920px-Escudo_de_Adjuntas%2C_Puerto_Rico.svg.png", role: "Mayor: José Hiram Soto Rivera", website: "adjuntas.pr.gov" },
  { name: "Aguada", logo: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/54/Escudo_de_Aguada%2C_Puerto_Rico.svg/250px-Escudo_de_Aguada%2C_Puerto_Rico.svg.png", role: "Mayor: Christian Cortés Feliciano", website: "aguada.pr.gov" },
  { name: "Aguadilla", logo: "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/81/Escudo_de_Aguadilla%2C_Puerto_Rico.svg/1920px-Escudo_de_Aguadilla%2C_Puerto_Rico.svg.png", role: "Mayor: Julio Roldán Concepción", website: "aguadilla.pr.gov" },
  { name: "Aguas Buenas", logo: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/53/Escudo_de_Aguas_Buenas%2C_Puerto_Rico.svg/1920px-Escudo_de_Aguas_Buenas%2C_Puerto_Rico.svg.png", role: "Mayor: Karina Nieves Serrano", website: "aguasbuenas.pr.gov" },
  { name: "Aibonito", logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcTxa7V32SHgX0F_VQ-k2T4yQKVzgZWSAWlsFAVoQLttHQ&s=", role: "Mayor: William Alicea Pérez", website: "aibonito.pr.gov" },
  { name: "Añasco", logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcQqTTlfhRi_LVQtLsWpnOL2o0QPKEFf4tK3vKM0S3PWbA&s=10", role: "Mayor: Kabir Solares García", website: "anasco.pr.gov" },
  { name: "Arecibo", logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcQPkNwFPqapmiU_SzhQGwh5QRFIpPVdG0cyIcfm1b5SBA&s=10", role: "Mayor: Carlos Ramírez Irizarry", website: "arecibo.pr.gov" },
  { name: "Arroyo", logo: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b8/Coat_of_Arms_official_of_Arroyo.svg/960px-Coat_of_Arms_official_of_Arroyo.svg.png", role: "Mayor: Eric Bachier Román", website: "arroyo.pr.gov" },
  { name: "Barceloneta", logo: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/95/Escudo_de_Barceloneta%2C_Puerto_Rico.svg/1920px-Escudo_de_Barceloneta%2C_Puerto_Rico.svg.png", role: "Mayor: Wanda Soler Rosario", website: "barceloneta.pr.gov" },
  { name: "Barranquitas", logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcS2XzHqvp3Kkv0VSY-cJVPukh6OcVwvfzMNqN2drVDn4g&s=10", role: "Mayor: Elliot Colón Blanco", website: "barranquitas.pr.gov" },
  { name: "Bayamón", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Coat_of_arms_of_Bayam%C3%B3n%2C_Puerto_Rico.svg/1280px-Coat_of_arms_of_Bayam%C3%B3n%2C_Puerto_Rico.svg.png", role: "Mayor: Ramón Luis Rivera Cruz", website: "www.bayamonpr.gov" },
  { name: "Cabo Rojo", logo: "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/81/Escudo_de_Cabo_Rojo%2C_Puerto_Rico.svg/330px-Escudo_de_Cabo_Rojo%2C_Puerto_Rico.svg.png", role: "Mayor: Jorge Morales Wiscovitch", website: "caborojo.pr.gov" },
  { name: "Caguas", logo: "https://upload.wikimedia.org/wikipedia/commons/8/86/Caguas_seal.gif", role: "Mayor: William Miranda Torres", website: "caguas.gov.pr" },
  { name: "Camuy", logo: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1f/Coat_of_arms_of_Camuy%2C_Puerto_Rico.svg/250px-Coat_of_arms_of_Camuy%2C_Puerto_Rico.svg.png", role: "Mayor: Gabriel Hernández Rodríguez", website: "camuy.pr.gov" },
  { name: "Canóvanas", logo: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/24/Escudo_de_Can%C3%B3vanas%2C_Puerto_Rico.svg/1280px-Escudo_de_Can%C3%B3vanas%2C_Puerto_Rico.svg.png", role: "Mayor: Lornna Soto Villanueva", website: "canovanas.pr.gov" },
  { name: "Carolina", logo: "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/07/Escudo_de_Carolina%2C_Puerto_Rico.svg/500px-Escudo_de_Carolina%2C_Puerto_Rico.svg.png", role: "Mayor: José Carlos Aponte Dalmau", website: "www.carolinapr.gov" },
  { name: "Cataño", logo: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/df/Escudo_de_Cata%C3%B1o%2C_Puerto_Rico.svg/3840px-Escudo_de_Cata%C3%B1o%2C_Puerto_Rico.svg.png", role: "Mayor: Julio Alicea Vasallo", website: "catano.pr.gov" },
  { name: "Cayey", logo: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a0/Escudo_de_Cayey%2C_Puerto_Rico.svg/330px-Escudo_de_Cayey%2C_Puerto_Rico.svg.png", role: "Mayor: Rolando Ortiz Velázquez", website: "cayey.pr.gov" },
  { name: "Ceiba", logo: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9a/Escudo_de_Ceiba%2C_Puerto_Rico.svg/330px-Escudo_de_Ceiba%2C_Puerto_Rico.svg.png", role: "Mayor: Samuel Rivera Báez", website: "ceiba.pr.gov" },
  { name: "Ciales", logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcR00Db9kEkAHfRfRf2v2nR-YgDHDNX-joXPFskzppiQeQ&s=", role: "Mayor: Alexander Burgos Otero", website: "ciales.pr.gov" },
  { name: "Cidra", logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcR6m_jTwK49ZOEWjvvQX9FQXdx7qZgkeFcPWYjccM3KYg&s=10", role: "Mayor: David Concepción González", website: "cidra.pr.gov" },
  { name: "Coamo", logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcSZXGRfjQt09JwxdfGQiIpVJKjkNbZmHugPrNTrTxx68g&s=", role: "Mayor: Juan Carlos García Padilla", website: "coamo.pr.gov" },
  { name: "Comerío", logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcTN8OUrzhzpte5xLzajfxZsTbnLB5-DS6PcRXJ5GVdPCQ&s=", role: "Mayor: Irvin Rivera González", website: "comerio.pr.gov" },
  { name: "Corozal", logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcSJYyaYcSkRnp2EO7-aaAYLU03e2Cr1aBcuhn84l-m_bQ&s=10", role: "Mayor: Luis García Rolón", website: "corozal.pr.gov" },
  { name: "Culebra", logo: "https://www.crwflags.com/fotw/images/p/pr)cu.gif", role: "Mayor: Edilberto Romero Llovet", website: "culebra.pr.gov" },
  { name: "Dorado", logo: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b2/Escudo_de_Dorado%2C_Puerto_Rico.svg/1920px-Escudo_de_Dorado%2C_Puerto_Rico.svg.png", role: "Mayor: Aníbal José Torres", website: "dorado.pr.gov" },
  { name: "Fajardo", logo: "https://upload.wikimedia.org/wikipedia/commons/4/49/Escudo_de_Fajardo_%28Puerto_Rico%29.svg", role: "Mayor: José Aníbal Meléndez Méndez", website: "fajardo.pr.gov" },
  { name: "Florida", logo: "https://upload.wikimedia.org/wikipedia/commons/c/cd/Blason_ville_Florida_%28Porto-Rico%29.svg", role: "Mayor: José Gerena Polanco", website: "florida.pr.gov" },
  { name: "Guánica", logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcRF4lmErwUlVnzWEgF88XCWDF5rKryi4vBrTUYpCAEijg&s=", role: "Mayor: Ismael Rodríguez Ramos", website: "guanica.pr.gov" },
  { name: "Guayama", logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcRiQrpePKxV1ahbgPcGkQDIdgPVaD-OuZOjTb41kSjeCg&s=", role: "Mayor: O'Brain Vázquez Molina", website: "guayama.pr.gov" },
  { name: "Guayanilla", logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcRGERwoUcw86EfW2dJ0kvI8-AcUrSsBsp1CikkiVs9cdQ&s=10", role: "Mayor: Raúl Rivera Rodríguez", website: "guayanilla.pr.gov" },
  { name: "Guaynabo", logo: "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e4/Escudo_de_Guaynabo%2C_Puerto_Rico.svg/330px-Escudo_de_Guaynabo%2C_Puerto_Rico.svg.png", role: "Mayor: Edward O'Neill", website: "guaynabo.pr.gov" },
  { name: "Gurabo", logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcThgC33LUAeiwd1LlV-G7QqVNtdbiHDzO25K92dZDwjoQ&s=", role: "Mayor: Vimarie Peña Dávila", website: "gurabo.pr.gov" },
  { name: "Hatillo", logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcTLLVuPEiuFoVRdvZrN4zZMiw2P4LmatLmgwqlXz_9dkA&s=10", role: "Mayor: Carlos Román Román", website: "hatillo.pr.gov" },
  { name: "Hormigueros", logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcROGBOL4Blsq_Py9fbGqw-WG24fxcYt6XTW064aRN4gng&s=10", role: "Mayor: Pedro García Figueroa", website: "hormigueros.pr.gov" },
  { name: "Humacao", logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcSsF3pO7AHHNtbpsLN3TOEXwvp82qDNgoTVR1YYYHZ6NA&s=", role: "Mayor: Rosamar Trujillo Plumey", website: "humacao.pr.gov" },
  { name: "Isabela", logo: "https://upload.wikimedia.org/wikipedia/commons/7/74/Coat_of_arms_of_Isabela%2C_Puerto_Rico.svg", role: "Mayor: Miguel Méndez Pérez", website: "isabela.pr.gov" },
  { name: "Jayuya", logo: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3e/Escudo_de_Jayuya%2C_Puerto_Rico.svg/250px-Escudo_de_Jayuya%2C_Puerto_Rico.svg.png", role: "Mayor: Jorge González Otero", website: "jayuya.pr.gov" },
  { name: "Juana Díaz", logo: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/34/CoA_Municipio_de_Juana_D%C3%ADaz.svg/500px-CoA_Municipio_de_Juana_D%C3%ADaz.svg.png", role: "Mayor: Ramón Hernández Torres", website: "juanadiaz.pr.gov" },
  { name: "Juncos", logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcSNub4WgBHRwosCpCUlbzhMpu_xa6Z_7AJLSoeWK4GPJw&s=", role: "Mayor: Alfredo Alejandro Carrión", website: "juncos.pr.gov" },
  { name: "Lajas", logo: "https://upload.wikimedia.org/wikipedia/commons/0/0b/Coat_of_arms_of_Lajas%2C_Puerto_Rico.svg", role: "Mayor: Jayson Martínez Maldonado", website: "lajas.pr.gov" },
  { name: "Lares", logo: "https://i.pinimg.com/474x/2e/2f/5f/2e2f5f9bfb85c38565a215fc9285ab23.jpg", role: "Mayor: Fabián Arroyo Rodríguez", website: "lares.pr.gov" },
  { name: "Las Marías", logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcQ4KonOaDfO_QOZPB0WE8RKUYAG4Q_NV0Nif-eROC_5cg&s=10", role: "Mayor: Edwin Soto Santiago", website: "lasmarias.pr.gov" },
  { name: "Las Piedras", logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcSU4SmPb6usSLSKe99gOGLsf5k7QarTTfTWJaJrCnFmDA&s=", role: "Mayor: Miguel López Rivera", website: "laspiedras.pr.gov" },
  { name: "Loíza", logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcT9qbXblTN4HFBNStof02APXPSoZS9OrvSmhfApw1jWAw&s=", role: "Mayor: Julia Nazario Fuentes", website: "loiza.pr.gov" },
  { name: "Luquillo", logo: "https://upload.wikimedia.org/wikipedia/commons/d/da/Escudo_de_Luquillo.svg", role: "Mayor: Jesús Márquez Rodríguez", website: "luquillo.pr.gov" },
  { name: "Manatí", logo: "https://upload.wikimedia.org/wikipedia/commons/c/c7/Coat_of_arms_of_Manat%C3%AD%2C_Puerto_Rico.svg", role: "Mayor: José Sánchez González", website: "manati.pr.gov" },
  { name: "Maricao", logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcR4JcJ478OOiWi6gmgmBLecBLIHiRGuxCTAB5qwxISbsQ&s=10", role: "Mayor: Wilfredo Ruiz Feliciano", website: "maricao.pr.gov" },
  { name: "Maunabo", logo: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7d/Escudo_de_Maunabo%2C_Puerto_Rico.svg/1280px-Escudo_de_Maunabo%2C_Puerto_Rico.svg.png", role: "Mayor: Ángel Omar Lafuente Amaro", website: "maunabo.pr.gov" },
  { name: "Mayagüez", logo: "https://upload.wikimedia.org/wikipedia/commons/b/b9/Mayag%C3%BCez_seal.JPG", role: "Mayor: Jorge Ramos Ruiz", website: "mayaguez.pr.gov" },
  { name: "Moca", logo: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/10/Escudo_de_Moca%2C_Puerto_Rico.svg/250px-Escudo_de_Moca%2C_Puerto_Rico.svg.png", role: "Mayor: Ángel Pérez", website: "moca.pr.gov" },
  { name: "Morovis", logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcRg8zTWTueLY7f3LQuodVub69jJIN3e-Zuvp8nAEqj59Q&s=", role: "Mayor: Carmen Maldonado González", website: "morovis.pr.gov" },
  { name: "Naguabo", logo: "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/eb/Escudo_de_Naguabo%2C_Puerto_Rico.svg/250px-Escudo_de_Naguabo%2C_Puerto_Rico.svg.png", role: "Mayor: Miraidaliz Rosario Pagán", website: "naguabo.pr.gov" },
  { name: "Naranjito", logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcT4U99h9jcl8AEkzwGErfcJK9tFt4cYTv1H_JmzcNuLBA&s=10", role: "Mayor: Orlando Ortiz Chevres", website: "naranjito.pr.gov" },
  { name: "Orocovis", logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcR-MEa4QbNuVXY7bpHWPFota6BWpbZIzQx5IFgvg7c__A&s=10", role: "Mayor: Jesús Colón Berlingeri", website: "orocovis.pr.gov" },
  { name: "Patillas", logo: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/99/Escudo_de_Patillas%2C_Puerto_Rico.svg/250px-Escudo_de_Patillas%2C_Puerto_Rico.svg.png", role: "Mayor: Maritza Sánchez Neris", website: "patillas.pr.gov" },
  { name: "Peñuelas", logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcQHcislaT-TV3ycCHpVUiL4M9qtaUX1p6PhpJKlHoY0Vw&s=", role: "Mayor: Gregory Gonsález Souchet", website: "penuelas.pr.gov" },
  { name: "Ponce", logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcSaF8Uhjd9uWu5V3aQkQVMihi0AS2X_ZqSZiSpXe6YvtA&s=", role: "Mayor: Marlese Sifre", website: "ponce.pr.gov" },
  { name: "Quebradillas", logo: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/37/Escudo_de_Quebradillas%2C_Puerto_Rico.svg/1920px-Escudo_de_Quebradillas%2C_Puerto_Rico.svg.png", role: "Mayor: Heriberto Vélez Vélez", website: "quebradillas.pr.gov" },
  { name: "Rincón", logo: "https://rincon.gov.pr/wp-content/uploads/2021/03/Oficial-Escudo-Rincon-Jpg-e1615994103658.jpg", role: "Mayor: Carlos López Bonilla", website: "rincon.pr.gov" },
  { name: "Río Grande", logo: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2e/Escudo_de_R%C3%ADo_Grande%2C_Puerto_Rico.svg/960px-Escudo_de_R%C3%ADo_Grande%2C_Puerto_Rico.svg.png", role: "Mayor: Ángel González Damudt", website: "riogrande.pr.gov" },
  { name: "Sabana Grande", logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcQbNEGjCAe_IgUfFpNUkBSqIkHy1O2fNzPT89qiNECNvQ&s=", role: "Mayor: Marcos Valentín Flores", website: "sabanagrande.pr.gov" },
  { name: "Salinas", logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcTOJGiA557SLhlJaX7BlAJIg7ld2c5ePxE7nU-0GyWcxA&s=10", role: "Mayor: Karilyn Bonilla Colón", website: "salinas.pr.gov" },
  { name: "San Germán", logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcQakiw4W7AdqdyV_aG-nfYrxQ_jp5z7pAICXS0Qf-g9sQ&s=", role: "Mayor: Virgilio Olivera Olivera", website: "sangerman.pr.gov" },
  { name: "San Juan", logo: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/79/Coat_of_arms_of_San_Juan_%28Puerto_Rico%29.svg/500px-Coat_of_arms_of_San_Juan_%28Puerto_Rico%29.svg.png", role: "Mayor: Miguel Romero Lugo", website: "sanjuan.pr.gov" },
  { name: "San Lorenzo", logo: "https://upload.wikimedia.org/wikipedia/commons/7/72/Coat_of_arms_of_San_Lorenzo%2C_Puerto_Rico.svg", role: "Mayor: Jaime Alverio Ramos", website: "sanlorenzo.pr.gov" },
  { name: "San Sebastián", logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcTGNQj3aEUadqeux0Zfdeqkx7UkK720JJInMksB6ViFzw&s=10", role: "Mayor: Eladio Cordona Quiles", website: "sansebastian.pr.gov" },
  { name: "Santa Isabel", logo: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/73/Escudo_de_Santa_Isabel%2C_Puerto_Rico.svg/1920px-Escudo_de_Santa_Isabel%2C_Puerto_Rico.svg.png", role: "Mayor: Meldwin Rivera Rodríguez", website: "santaisabel.pr.gov" },
  { name: "Toa Alta", logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcSH3ZDjWuPjWjD7h3vrP6NDNG2NA-cKoRaGRCo7GvXkmg&s=10", role: "Mayor: Clemente Agosto", website: "toaalta.pr.gov" },
  { name: "Toa Baja", logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcTwKlIMyb00ko3ZOJq-HCitY3Ex3LqF32gfI21QwLhjQw&s=10", role: "Mayor: Bernardo Márquez García", website: "toabajo.pr.gov" },
  { name: "Trujillo Alto", logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcQlL4K9hmW8mPelKmjiHNIzvS30KEGrmAU2iLgdGUnD5A&s=", role: "Mayor: Pedro Rodríguez González", website: "trujilloalto.pr.gov" },
  { name: "Utuado", logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcRWdQBrXcHnR05LCQMh-TqlV5RHA6MV5IhKE_Z4gCUQQw&s=10", role: "Mayor: Jorge Pérez Heredia", website: "utuado.pr.gov" },
  { name: "Vega Alta", logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcRfyPDVtrnlEhFn9DqU6aaJGp1Cn2EbNE4VbRU_mbb0jA&s=", role: "Mayor: María Vega Pagán", website: "vegaalta.pr.gov" },
  { name: "Vega Baja", logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcQwVv4OoVMta713At1JBASdRz4UE8VWjpf4PwpMiOlO-A&s=", role: "Mayor: Marcos Cruz Molina", website: "vegabaja.pr.gov" },
  { name: "Vieques", logo: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b2/Escudo_de_Vieques%2C_Puerto_Rico.svg/1920px-Escudo_de_Vieques%2C_Puerto_Rico.svg.png", role: "Mayor: José Corcino Acevedo", website: "vieques.pr.gov" },
  { name: "Villalba", logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcR1kyMEBPxN70m_OhnAMMonMvwFBc-Y2Jd8VQPthEHYoQ&s=", role: "Mayor: Danny Santiago Núñez", website: "villalba.pr.gov" },
  { name: "Yabucoa", logo: "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4e/Escudo_de_Yabucoa%2C_Puerto_Rico.svg/1920px-Escudo_de_Yabucoa%2C_Puerto_Rico.svg.png", role: "Mayor: Rafael Surillo Ruiz", website: "yabucoa.pr.gov" },
  { name: "Yauco", logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcT97v8ZW5hda9bukHjGC4sN7Odgz1mqRfKUAvkJSPuAPQ&s=10", role: "Mayor: Ángel Luis Torres Ortiz", website: "yauco.pr.gov" },
];

function buildPillars(isEs: boolean): Pillar[] {
  return [
    {
      id: "corporate",
      n: "01",
      tag: isEs ? "CORPORATIVO" : "CORPORATE",
      name: isEs ? "Corporativo" : "Corporate",
      description: isEs
        ? "Empresas y marcas que patrocinan activaciones de bondad, igualan las horas de voluntariado de sus equipos y ayudan a financiar el alcance del movimiento."
        : "Businesses and brands that sponsor kindness activations, match their teams' volunteer hours, and help fund the movement's reach.",
      partners: [
        { name: "Eucaforest", logo: "corporate_eucaforest-logo1b.png" },
        { name: "Loving AI", logo: "corporate_loving-ai.webp", website: "lovingai.org" },
        { name: "NuCalm", logo: "corporate_nucalm.png", website: "nucalm.com" },
        { name: "SHRM", logo: "corporate_shrm.png", website: "shrm.org" },
      ],
    },
    {
      id: "media",
      n: "02",
      tag: isEs ? "MEDIOS Y PRENSA" : "MEDIA / PRESS",
      name: isEs ? "Medios y Prensa" : "Media / Press",
      description: isEs
        ? "Cadenas y redes de medios que amplifican el movimiento ante sus audiencias y ayudan a correr la voz de la bondad."
        : "Broadcasters and media networks that amplify the movement to their audiences and help spread the word on kindness.",
      partners: [{ name: "C-Suite Network", logo: "corporate_c-suite-network.png", website: "c-suitenetwork.com" }],
    },
    {
      id: "faith-based",
      n: "03",
      tag: isEs ? "FE Y ESPIRITUALIDAD" : "FAITH-BASED",
      name: isEs ? "Fe y Espiritualidad" : "Faith-Based",
      description: isEs
        ? "Iglesias, ministerios y comunidades de fe que movilizan a sus congregaciones y tejen la bondad en su servicio a los demás."
        : "Churches, ministries, and faith communities that mobilize their congregations and weave kindness into their service to others.",
      partners: [
        { name: "Awaken — Michael Krauss", logo: "faith-based_awaken---michael-krauss.jpg" },
        { name: "Oneness", logo: "faith-based_oneness.png" },
        { name: "Yoga Vidya", logo: "faith-based_yoga-vidya.jpg" },
      ],
    },
    {
      id: "government",
      n: "04",
      tag: isEs ? "GOBIERNO" : "GOVERNMENT",
      name: isEs ? "Gobierno" : "Government",
      description: isEs
        ? "Municipios y agencias públicas que llevan la campaña a sus ciudades, proclaman la Temporada de Bondad y apoyan activaciones locales."
        : "Municipalities and public agencies that bring the campaign to their cities, proclaim the Kindness Season, and support local activations.",
      partners: [...PR_MUNICIPALITIES],
    },
    {
      id: "nonprofits",
      n: "05",
      tag: isEs ? "ORG. SIN FINES DE LUCRO" : "NONPROFIT",
      name: isEs ? "Organizaciones sin Fines de Lucro" : "Nonprofits",
      description: isEs
        ? "Organizaciones comunitarias que coorganizan activaciones, comparten recursos de bondad y conectan al movimiento con las personas a quienes sirven."
        : "Community organizations that co-host activations, share kindness resources, and connect the movement to the people they serve.",
      partners: [
        { name: "Coquí Charities", logo: "nonprofits_coqui-sq-logo-small-2-1.png" },
        { name: "Good Deeds Day", logo: "nonprofits_good-deeds-day.webp", website: "good-deeds-day.org" },
        { name: "HeartMath Institute", logo: "nonprofits_hmi-logo.png", website: "heartmath.org" },
        { name: "Kids for Peace", logo: "nonprofits_kids-for-peace.png", website: "kidsforpeaceglobal.org" },
        { name: "Million Peacemakers", logo: "nonprofits_million-peacemakers.png" },
        { name: "Peace and Love Inc. Ltd" },
        { name: "Te Amo PR", logo: "nonprofits_te-amo-pr.png", website: "teamopr.org" },
        { name: "Unify.org", logo: "nonprofits_unify.webp", website: "unify.org" },
      ],
    },
    {
      id: "education",
      n: "06",
      tag: isEs ? "EDUCACIÓN" : "EDUCATION",
      name: isEs ? "Educación" : "Education",
      description: isEs
        ? "Escuelas, campus y educadores que llevan la bondad a las aulas con actividades y proyectos liderados por estudiantes, adecuados para cada edad."
        : "Schools, campuses, and educators who bring kindness into classrooms with age-appropriate prompts, activities, and student-led projects.",
      partners: [
        { name: "Departamento de Educación PR", logo: "education_departamento-educacion-pr.png", website: "de.pr.gov" },
        { name: "JA Worldwide", logo: "education_ja-worldwide.png", website: "jaworldwide.org" },
        { name: "Learning Planet Institute", logo: "education_learning-planet-institute.png", website: "learning-planet.org" },
        { name: "Ministry of Education, Culture, Youth & Sport (MECYS)", logo: "education_mecys.png" },
        { name: "Ministry of Education — Anguilla", logo: "education_ministry-of-education-anguilla.png" },
        {
          name: "Ministry of Education, Health & Social Services — Montserrat",
          logo: "education_ministry-of-education-montserrat.png",
        },
        { name: "Money & You / Excellerated Business Schools", logo: "education_money-and-you.png" },
      ],
    },
  ];
}

const INITIALS_STOPWORDS = new Set(["and", "of", "the", "&", "de", "la", "el"]);

function initials(name: string) {
  const words = name.split(/\s+/).filter((w) => w && !INITIALS_STOPWORDS.has(w.toLowerCase()));
  return words
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function logoSrc(logo: string) {
  return logo.startsWith("http") ? logo : `/partners/${logo}`;
}

function PartnerCard({ partner, tag }: { partner: Partner; tag: string }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <div
        className={`flex h-44 items-center justify-center border-b border-border p-5 ${
          partner.dark ? "bg-cyan-900" : "bg-white"
        }`}
      >
        {partner.logo ? (
          <img
            src={logoSrc(partner.logo)}
            alt={partner.name}
            loading="lazy"
            className="max-h-32 w-auto max-w-[88%] object-contain"
          />
        ) : (
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full bg-warm-sand font-display text-2xl text-foreground"
            aria-hidden="true"
          >
            {initials(partner.name)}
          </div>
        )}
      </div>
      <div className="flex flex-grow flex-col gap-1.5 p-4">
        <span className="text-[10px] font-bold tracking-[0.14em] text-foreground/45">{tag}</span>
        <h3 className="text-sm font-bold leading-snug text-foreground">{partner.name}</h3>
        <div className="mt-auto flex flex-col gap-1 pt-2">
          {partner.role && <span className="text-xs font-medium leading-snug text-foreground/60">{partner.role}</span>}
          {partner.website && (
            <a
              href={`https://${partner.website}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Visit ${partner.name} website (opens in a new tab)`}
              className="inline-flex items-center gap-1 break-all text-xs font-bold text-[#0079A8] hover:underline"
            >
              {partner.website}
              <ExternalLink size={12} className="shrink-0" />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

function compactNumber(n: number, locale: string) {
  return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export default function PartnersPage() {
  const { lang } = useLanguage();
  const isEs = lang === "es";
  const locale = isEs ? "es" : "en";
  const { data: totals } = useMovementTotals();
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("all");

  const pillars = useMemo(() => buildPillars(isEs), [isEs]);
  const totalPartners = useMemo(() => pillars.reduce((n, p) => n + p.partners.length, 0), [pillars]);

  const q = query.trim().toLowerCase();
  const matchesQuery = (p: Partner) => !q || p.name.toLowerCase().includes(q) || (p.website ?? "").includes(q);

  const chips = useMemo(() => {
    const counts = pillars.map((p) => ({ id: p.id, label: p.name, count: p.partners.filter(matchesQuery).length }));
    const allCount = counts.reduce((n, c) => n + c.count, 0);
    return [{ id: "all", label: isEs ? "Todos" : "All", count: allCount }, ...counts];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pillars, q, isEs]);

  const sections = useMemo(
    () =>
      pillars
        .filter((p) => sector === "all" || p.id === sector)
        .map((p) => ({ ...p, items: p.partners.filter(matchesQuery) }))
        .filter((p) => p.items.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pillars, sector, q],
  );

  const shown = sections.reduce((n, s) => n + s.items.length, 0);

  return (
    <div className="min-h-screen bg-warm-cream">
      <SEO
        title="Our Partners — Pásalo Pa'lante"
        description="Meet the corporate, media, faith-based, government, nonprofit, and education partners powering Pásalo Pa'lante and the global kindness movement."
        path="/partners"
      />
      <ScrollToTop />
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-cyan-900 text-warm-cream">
          <img
            src="/world-map.svg"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 top-10 w-[560px] opacity-[0.06]"
          />
          <div className="section-padding relative mx-auto flex max-w-6xl flex-wrap items-end gap-12 pb-16 pt-28 md:pt-32">
            <div className="flex flex-1 flex-col gap-6" style={{ flexBasis: "560px" }}>
              <p className="text-xs font-bold tracking-[0.18em] text-warm-gold">
                {isEs ? "NUESTROS SOCIOS · LA COALICIÓN DE BONDAD" : "OUR PARTNERS · THE KINDNESS COALITION"}
              </p>
              <h1 className="font-display text-4xl leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
                {isEs ? "La coalición que pasa la bondad hacia adelante." : "The coalition carrying kindness forward."}
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-warm-cream/75 md:text-lg">
                {isEs
                  ? "Pásalo Pa'lante avanza gracias a las organizaciones que lo respaldan. A través de seis pilares, nuestros socios coorganizan activaciones, financian el movimiento y llevan la bondad a cada rincón de sus comunidades."
                  : "Pásalo Pa'lante moves forward because of the organizations standing behind it. Across six pillars, our partners co-host activations, fund the movement, and carry kindness into every corner of their communities."}
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                <a
                  href="#directory"
                  className="inline-flex h-[52px] items-center justify-center rounded-full bg-warm-terracotta px-7 text-sm font-bold text-white transition-transform duration-200 hover:scale-105"
                >
                  {isEs ? "Explora el directorio" : "Explore the directory"}
                </a>
                <a
                  href="#join"
                  className="inline-flex h-[52px] items-center justify-center rounded-full border-[1.5px] border-warm-cream/40 px-7 text-sm font-bold text-warm-cream transition-colors duration-200 hover:border-warm-cream"
                >
                  {isEs ? "Conviértete en socio" : "Become a partner"}
                </a>
              </div>
            </div>
            <dl className="grid flex-1 grid-cols-3 gap-0 border-t border-warm-cream/20" style={{ flexBasis: "320px" }}>
              <div className="flex flex-col gap-1.5 pr-4 pt-5">
                <dd className="font-display text-4xl leading-none md:text-5xl">{totalPartners}</dd>
                <dt className="text-xs font-semibold leading-tight text-warm-cream/70">
                  {isEs ? "Organizaciones socias" : "Partner organizations"}
                </dt>
              </div>
              <div className="flex flex-col gap-1.5 border-l border-warm-cream/20 px-4 pt-5">
                <dd className="font-display text-4xl leading-none md:text-5xl">{pillars.length}</dd>
                <dt className="text-xs font-semibold leading-tight text-warm-cream/70">
                  {isEs ? "Sectores trabajando juntos" : "Sectors working together"}
                </dt>
              </div>
              <div className="flex flex-col gap-1.5 border-l border-warm-cream/20 py-5 pl-4">
                <dd className="font-display text-4xl leading-none text-warm-gold md:text-5xl">
                  {totals ? compactNumber(totals.pledged, locale) : "—"}
                </dd>
                <dt className="text-xs font-semibold leading-tight text-warm-cream/70">
                  {isEs ? "Actos de bondad, una meta compartida" : "Acts of kindness, one shared goal"}
                </dt>
              </div>
            </dl>
          </div>
          <div aria-hidden="true" className="flex h-1.5">
            <span className="flex-1" style={{ background: "#00a3e0" }} />
            <span className="flex-1 bg-warm-terracotta" />
            <span className="flex-1 bg-warm-gold" />
            <span className="flex-1" style={{ background: "#d81b60" }} />
          </div>
        </section>

        {/* Sticky search / filter bar */}
        <div id="directory" className="sticky top-0 z-10 border-b border-border bg-warm-cream/95 backdrop-blur">
          <div className="section-padding mx-auto flex max-w-6xl flex-wrap items-center gap-3 py-4">
            <div className="relative min-w-[220px] flex-[999_1_300px]">
              <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40" />
              <label htmlFor="partner-search" className="sr-only">
                {isEs ? "Buscar socios" : "Search partners"}
              </label>
              <input
                id="partner-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={isEs ? "Buscar socios" : "Search partners"}
                className="h-12 w-full rounded-full border border-border bg-white pl-11 pr-4 text-sm text-foreground outline-none focus:border-warm-terracotta"
              />
            </div>
            <div role="group" aria-label={isEs ? "Filtrar por sector" : "Filter by sector"} className="flex flex-[1_1_auto] flex-wrap gap-2">
              {chips.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={sector === c.id}
                  onClick={() => setSector(c.id)}
                  className={`flex h-10 items-center gap-1.5 rounded-full border px-4 text-[13px] font-bold transition-colors ${
                    sector === c.id
                      ? "border-cyan-900 bg-cyan-900 text-white"
                      : "border-border bg-white text-foreground hover:border-warm-terracotta"
                  }`}
                >
                  {c.label}
                  <span className="text-xs font-semibold opacity-75">{c.count}</span>
                </button>
              ))}
            </div>
            <span className="text-[13px] font-semibold text-foreground/70">
              {isEs ? `Mostrando ${shown} de ${totalPartners}` : `Showing ${shown} of ${totalPartners}`}
            </span>
          </div>
        </div>

        {/* Directory */}
        <div className="section-padding mx-auto flex max-w-6xl flex-col gap-16 py-14">
          <p className="-mb-10 max-w-3xl rounded-xl bg-warm-sand px-5 py-4 text-base font-medium leading-relaxed text-foreground">
            {isEs
              ? "Estos son los socios fundadores confirmados para la Temporada de Bondad Global. Hay más organizaciones completando su incorporación y se añadirán a esta lista a medida que se confirmen."
              : "These are the founding partners confirmed for Global Kindness Season. More organizations are completing onboarding and will be added to this list as they're confirmed."}
          </p>
          {sections.map((s) => (
            <section key={s.id} aria-labelledby={`sec-${s.id}`} className="flex flex-col gap-6">
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-5">
                <div className="flex items-baseline gap-4">
                  <span className="font-display text-xl text-warm-terracotta">{s.n}</span>
                  <h2 id={`sec-${s.id}`} className="font-display text-3xl text-foreground md:text-4xl">
                    {s.name}
                  </h2>
                  <span className="whitespace-nowrap rounded-full bg-warm-sand px-2.5 py-1 text-xs font-bold text-foreground/70">
                    {s.items.length} {s.items.length === 1 ? (isEs ? "socio" : "partner") : isEs ? "socios" : "partners"}
                  </span>
                </div>
                <p className="max-w-lg text-sm leading-relaxed text-foreground/70">{s.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4">
                {s.items.map((p) => (
                  <PartnerCard key={p.name} partner={p} tag={s.tag} />
                ))}
              </div>
            </section>
          ))}

          {shown === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-3xl border-[1.5px] border-dashed border-border px-6 py-16 text-center">
              <h2 className="font-display text-2xl text-foreground">
                {isEs ? "Ningún socio coincide con esa búsqueda" : "No partners match that search"}
              </h2>
              <p className="text-sm text-foreground/70">
                {isEs ? "Prueba con otro nombre o explora todos los sectores." : "Try another name, or browse all sectors."}
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setSector("all");
                }}
                className="mt-2 h-[46px] rounded-full bg-cyan-900 px-6 text-sm font-bold text-white"
              >
                {isEs ? "Mostrar todos los socios" : "Show all partners"}
              </button>
            </div>
          )}
        </div>

        {/* Become a partner */}
        <section id="join" className="section-padding mx-auto max-w-6xl pb-24 pt-4">
          <div className="relative overflow-hidden rounded-[28px] bg-cyan-900 p-8 text-warm-cream md:p-16">
            <img
              src="/world-map.svg"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-20 -left-16 w-[340px] opacity-[0.06]"
            />
            <div className="relative flex flex-wrap items-center gap-10">
              <div className="flex flex-1 flex-col gap-4" style={{ flexBasis: "420px" }}>
                <p className="text-xs font-bold tracking-[0.18em] text-warm-gold">
                  {isEs ? "CONVIÉRTETE EN SOCIO" : "BECOME A PARTNER"}
                </p>
                <h2 className="font-display text-3xl leading-tight md:text-4xl">
                  {isEs ? "Pon el nombre de tu organización detrás de la bondad." : "Put your organization's name behind kindness."}
                </h2>
                <p className="text-base leading-relaxed text-warm-cream/75">
                  {isEs
                    ? "Únete al movimiento y ayúdanos a pasar la bondad. Cuéntanos sobre tu organización y te contactaremos con los próximos pasos."
                    : "Join the movement and help us pass kindness forward. Tell us about your organization and we'll follow up with next steps."}
                </p>
              </div>
              <div className="flex flex-1 flex-col gap-3" style={{ flexBasis: "280px", maxWidth: "320px" }}>
                <a
                  href="/partners/apply"
                  className="flex h-14 items-center justify-center rounded-full bg-warm-terracotta text-base font-bold text-white transition-transform duration-200 hover:scale-105"
                >
                  {isEs ? "Contáctanos" : "Get in touch"}
                </a>
                <a
                  href="mailto:info@teamopr.org"
                  className="flex h-14 items-center justify-center rounded-full border-[1.5px] border-warm-cream/40 text-sm font-semibold text-warm-cream"
                >
                  info@teamopr.org
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
