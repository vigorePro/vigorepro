'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from './vitrine.module.css';
  import { destaques } from '@/app/_data/destaques';

  function VitrineContent() {
    const searchParams = useSearchParams();
    const slug = searchParams.get('slug') || 'dolcedolce';

      // Função para gerar a linha serpentina
    const buildConnector = (index: number, total: number) => {
          const startY = 100;
          const spacing = 150;
      const totalHeight = (total - 1) * spacing;
          const amplitude = 80;
          const frequency = 0.5;

          const y1 = startY + index * spacing;
      const y2 = startY + (index + 1) * spacing;

      // Gera uma curva serpentina com pontos de controle dourados (nós)
      const controlX = 500 + Math.sin(index * frequency) * amplitude;
      const midY = (y1 + y2) / 2;

      return {
              x1: 100,
              y1: y1,
              x2: 900,
              y2: y2,
              controlX: controlX,
              midY: midY
      };
    };

    return (
      <div className={styles.container}>
      <div className={styles.header}>
      <h1 className={styles.title}>Dolce & Dolce</h1>
      <p className={styles.subtitle}>Pães, doces e café</p>
            </div>

      <div className={styles.vitrineWrapper}>
      <svg className={styles.connector} viewBox="0 0 1000 800" preserveAspectRatio="xMidYMid meet">
      {destaques.map((_, index) => {
        if (index < destaques.length - 1) {
          const conn = buildConnector(index, destaques.length);
          return (
            <g key={`connector-${index}`}>
            {/* Linha serpentina tracejada */}
                              <path
            d={`M ${conn.x1} ${conn.y1} Q ${conn.controlX} ${conn.midY} ${conn.x2} ${conn.y2}`}
            stroke="rgba(218, 165, 32, 0.4)"
                                strokeWidth="2"
                                strokeDasharray="5,5"
                                fill="none"
                              />
            {/* Nó dourado */}
                              <circle
            cx={conn.controlX}
            cy={conn.midY}
                                r="8"
                                fill="#DAA520"
                                opacity="0.7"
                              />
                            </g>
          );
        }
                      return null;
      })}
              </svg>

      <div className={styles.pratos}>
      {destaques.map((item, index) => (
        <div key={item.id} className={`${styles.prato} ${styles[`prato${index}`]}`}>
        <div className={styles.disc}>
                        <img
        src={item.imagem}
        alt={item.nome}
        className={styles.imagen}
                        />
        <div className={styles.overlay}>
        <h3 className={styles.nome}>{item.nome}</h3>
        <p className={styles.descricao}>{item.descricao}</p>
        <div className={styles.selo}>
        <span className={styles.peso}>{item.peso}g</span>
                          </div>
        <p className={styles.preco}>R$ {item.preco.toFixed(2)}</p>
        <button className={styles.cta}>Fazer pedido</button>
                        </div>
                      </div>
                    </div>
      ))}
              </div>
            </div>
          </div>
    );
  }

    export default function Vitrine() {
      return (
        <Suspense fallback={<div className={styles.container}>Carregando...</div>}>
              <VitrineContent />
            </Suspense>
      );
    }
