export interface Destaque {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  peso: number;
  imagem: string;
}

export const destaques: Destaque[] = [
  {
    id: '1',
    nome: 'Bolo de Chocolate Belga',
    descricao: 'Bolo ú mido de chocolate belga com ganache e raspas de chocolate',
    preco: 85.00,
    peso: 800,
    imagem: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=400&fit=crop'
  },
  {
    id: '2',
    nome: 'Torta de Morango',
    descricao: 'Torta crocante com morango fresco e calda doce',
    preco: 79.00,
    peso: 750,
    imagem: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=400&fit=crop'
  },
  {
    id: '3',
    nome: 'Cheesecake Frutas',
    descricao: 'Cheesecake cremoso coberto com frutas vermelhas frescas',
    preco: 72.00,
    peso: 700,
    imagem: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&h=400&fit=crop'
  },
  {
    id: '4',
    nome: 'Pavê Dois Amores',
    descricao: 'Pavê clássico com duas camadas de chocolate e baunilha',
    preco: 68.00,
    peso: 650,
    imagem: 'https://images.unsplash.com/photo-1571115764595-644a12c7cb89?w=400&h=400&fit=crop'
  }
];
