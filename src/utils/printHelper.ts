import { Order } from '../types';
import { FLAVOR_OPTIONS, TOPPING_OPTIONS } from '../data';

export const printHtmlContent = (htmlContent: string) => {
  let iframe = document.getElementById('supreme-print-iframe') as HTMLIFrameElement;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'supreme-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.bottom = '0';
    iframe.style.right = '0';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.opacity = '0.01';
    iframe.style.border = 'none';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) return;

  doc.open();
  doc.write(htmlContent);
  doc.close();

  // Trigger print directly from parent for maximum cross-browser reliability
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error("Parent-triggered iframe print failed:", e);
    }
  }, 250);
};

export const printOrderReceipt = (order: Order, storeSettings: any) => {
  // Extract printer configuration from store settings or use defaults
  const paperWidth = storeSettings?.printerPaperWidth || '80mm';
  const numCopies = Number(storeSettings?.printerNumCopies || 1);
  const fontSize = Number(storeSettings?.printerFontSize || 12);
  const fontType = storeSettings?.printerFontType || 'monospace';
  const showAddress = storeSettings?.printerShowAddress !== false;
  const headerMessage = storeSettings?.printerHeaderMessage || 'COMPROVANTE IMPRESSO';
  const footerMessage = storeSettings?.printerFooterMessage || 'Muito obrigado pela preferência!';

  // Determine font family
  let fontFamily = "'Courier New', Courier, monospace";
  if (fontType === 'sans-serif') {
    fontFamily = "'Inter', system-ui, -apple-system, sans-serif";
  } else if (fontType === 'serif') {
    fontFamily = "'Playfair Display', Georgia, serif";
  }

  const itemsHtml = order.items.map((item) => {
    let customDetails = '';
    if (item.isCustomCup && item.customCupConfig) {
      const config = item.customCupConfig;
      const baseText = config.base === 'acai' ? 'Açaí' : config.base === 'sorvete' ? 'Sorvete' : 'Casadinho (Açaí + Sorvete)';
      
      const flavorNames = (config.flavors || [])
        .map(fid => FLAVOR_OPTIONS.find(f => f.id === fid)?.name || fid)
        .join(', ');
        
      const toppingNames = (config.toppings || [])
        .map(tid => TOPPING_OPTIONS.find(t => t.id === tid)?.name || tid)
        .join(', ');

      customDetails = `
        <div style="font-size: ${fontSize - 1}px; color: #111; margin-left: 10px; margin-top: 2px; line-height: 1.3;">
          <strong>• Base:</strong> ${baseText}<br/>
          <strong>• Tamanho:</strong> ${config.size}<br/>
          ${flavorNames ? `<strong>• Sabores:</strong> ${flavorNames}<br/>` : ''}
          ${toppingNames ? `<strong>• Adicionais:</strong> ${toppingNames}<br/>` : ''}
        </div>
      `;
    }
    const notesHtml = item.notes ? (() => {
      const lower = item.notes.toLowerCase();
      const isRetire = lower.includes('retir') || lower.includes('tirar') || lower.includes('sem ') || lower.includes('tire');
      const isSeparado = lower.includes('separad') || lower.includes('mande separ') || lower.includes('pote') || lower.includes('potinho') || lower.includes('mandar separ');
      
      let badgeStyle = 'background: #f0f0f0; color: #333; border: 1px solid #ccc; font-weight: bold;';
      let titlePrefix = 'Obs: ';
      
      if (isRetire && isSeparado) {
        badgeStyle = `background: #fff1f2; color: #be123c; border: 2px solid #e11d48; font-weight: 900; text-transform: uppercase; font-size: ${fontSize - 1}px;`;
        titlePrefix = '⚠️ ATENÇÃO (RETIRAR & SEPARAR): ';
      } else if (isRetire) {
        badgeStyle = `background: #fffbeb; color: #b45309; border: 2px dashed #f59e0b; font-weight: 900; text-transform: uppercase; font-size: ${fontSize - 1}px;`;
        titlePrefix = '🚫 ATENÇÃO (RETIRAR INGREDIENTE): ';
      } else if (isSeparado) {
        badgeStyle = `background: #ecfeff; color: #0891b2; border: 2px solid #06b6d4; font-weight: 900; text-transform: uppercase; font-size: ${fontSize - 1}px;`;
        titlePrefix = '📦 ATENÇÃO (MANDAR SEPARADO): ';
      } else {
        badgeStyle = `background: #f8fafc; color: #475569; border: 1px solid #cbd5e1; font-weight: bold;`;
        titlePrefix = 'Obs: ';
      }
      
      return `<div style="font-size: ${fontSize - 2}px; ${badgeStyle} margin-left: 10px; margin-top: 5px; padding: 4px 6px; border-radius: 4px; display: block; line-height: 1.3;">${titlePrefix}${item.notes}</div>`;
    })() : '';

    return `
      <div style="margin-bottom: 8px; border-bottom: 1px dashed #ccc; padding-bottom: 6px;">
        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: ${fontSize}px;">
          <span>${item.quantity}x ${item.menuItem.name}</span>
          <span>R$ ${((item.customCupPrice || item.menuItem.price) * item.quantity).toFixed(2)}</span>
        </div>
        ${customDetails}
        ${notesHtml}
      </div>
    `;
  }).join('');

  const paymentTypeText = 
    order.details.paymentType === 'pix' ? 'PIX Online' :
    order.details.paymentType === 'card' ? 'Cartão pelo App' :
    order.details.paymentType === 'cash_on_delivery' ? 'Dinheiro' : 'Cartão na Entrega';

  const addressDetails = order.details.address;
  const addressHtml = order.details.deliveryType === 'delivery' && addressDetails
    ? `<div><strong>Endereço de Entrega:</strong><br/>${addressDetails.street}, ${addressDetails.number} - Bairro: ${addressDetails.neighborhood || 'Não informado'}<br/>Cidade: ${addressDetails.city}${addressDetails.reference ? `<br/>Ref: ${addressDetails.reference}` : ''}</div>`
    : `<div><strong>Retirada no Balcão:</strong><br/>Cliente irá retirar o pedido na loja.</div>`;

  // Render copy block
  const renderCopy = (copyIndex: number) => {
    const copyLabel = numCopies > 1 
      ? `<div style="text-align: center; font-weight: bold; font-size: ${fontSize - 1}px; border: 1px solid #000; padding: 4px; margin-bottom: 10px; text-transform: uppercase;">VIA ${copyIndex === 1 ? 'COZINHA/PRODUÇÃO' : copyIndex === 2 ? 'CLIENTE/ENTREGA' : 'CONTROLE/SALA'}</div>`
      : '';

    return `
      <div class="receipt-copy" style="page-break-after: always; padding: 5px; box-sizing: border-box;">
        ${copyLabel}
        <div class="header">
          <div class="title" style="font-size: ${fontSize + 4}px;">${storeSettings?.name || 'SORVETERIA SUPREME'}</div>
          ${showAddress && storeSettings?.address ? `<div class="subtitle">${storeSettings.address}<br/>Tel/WhatsApp: ${storeSettings.phone || '(11) 99999-9999'}</div>` : ''}
        </div>

        <div class="section">
          <div class="flex-between">
            <span><strong>${headerMessage.toUpperCase()}</strong></span>
            <span><strong>#${order.id.slice(-6).toUpperCase()}</strong></span>
          </div>
          <div>Data/Hora: ${order.timestamp}</div>
          <div>Status: <strong>${
            order.status === 'waiting' ? 'Aguardando' :
            order.status === 'preparing' ? 'Preparando' :
            order.status === 'delivering' ? (order.details.deliveryType === 'delivery' ? 'A Caminho' : 'Pronto p/ Retirada') : 'Entregue'
          }</strong></div>
        </div>

        <div class="section">
          <div><strong>Cliente:</strong> ${order.details.customerName}</div>
          <div><strong>Telefone:</strong> ${order.details.customerPhone}</div>
          <div style="margin-top: 4px;">
            ${addressHtml}
          </div>
        </div>

        <div class="section">
          <div style="font-weight: bold; margin-bottom: 6px; text-transform: uppercase;">Itens do Pedido:</div>
          ${itemsHtml}
        </div>

        <div class="section" style="border-bottom: none;">
          <div class="flex-between">
            <span>Forma de Pagamento:</span>
            <span>${paymentTypeText}</span>
          </div>
          <div class="flex-between totais" style="border-top: 1px dashed #eee; padding-top: 4px; font-size: ${fontSize + 1}px;">
            <span>VALOR TOTAL:</span>
            <span>R$ ${order.total.toFixed(2)}</span>
          </div>
        </div>

        <div class="footer">
          <div>${footerMessage}</div>
          <div style="margin-top: 4px; font-weight: bold; font-size: ${fontSize - 2}px;">Desenvolvido por Sorveteria Supreme • Pedidos Online</div>
        </div>
      </div>
    `;
  };

  // Generate copies separated by visual/print cutting guides
  let receiptContent = '';
  for (let i = 1; i <= numCopies; i++) {
    receiptContent += renderCopy(i);
    if (i < numCopies) {
      receiptContent += `
        <div class="cutter-guide" style="text-align: center; margin: 25px 0 35px 0; border-top: 2px dashed #333; height: 1px; position: relative;">
          <span style="position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: #fff; padding: 0 10px; font-size: 10px; color: #555; font-family: monospace;">✂️ CORTAR AQUI ✂️</span>
        </div>
      `;
    }
  }

  const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Pedido #${order.id.slice(-6).toUpperCase()}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
        body {
          font-family: ${fontFamily};
          color: #000;
          padding: 8px;
          margin: 0;
          font-size: ${fontSize}px;
          line-height: 1.4;
          background: #fff;
          width: ${paperWidth === '58mm' ? '54mm' : '76mm'};
        }
        .header {
          text-align: center;
          margin-bottom: 12px;
          border-bottom: 2px dashed #000;
          padding-bottom: 8px;
        }
        .title {
          font-weight: bold;
          margin: 0 0 4px 0;
          text-transform: uppercase;
        }
        .subtitle {
          font-size: ${fontSize - 2}px;
          margin: 0;
          color: #333;
        }
        .section {
          margin-bottom: 10px;
          border-bottom: 1px dashed #000;
          padding-bottom: 8px;
        }
        .flex-between {
          display: flex;
          justify-content: space-between;
        }
        .totais {
          margin-top: 6px;
          font-weight: bold;
        }
        .footer {
          text-align: center;
          margin-top: 12px;
          font-size: ${fontSize - 2}px;
          border-top: 2px dashed #000;
          padding-top: 8px;
        }
        @media print {
          body {
            width: ${paperWidth};
            margin: 0;
            padding: 0;
          }
          .receipt-copy {
            page-break-after: always;
          }
          .receipt-copy:last-child {
            page-break-after: avoid;
          }
          .cutter-guide {
            border-top: 2px dashed #000 !important;
            margin: 40px 0 !important;
          }
        }
      </style>
    </head>
    <body>
      ${receiptContent}
      <script>
        window.focus();
        window.print();
      </script>
    </body>
    </html>
  `;

  printHtmlContent(fullHtml);
};

export const printCloseoutReceipt = (data: any, storeSettings: any) => {
  const paperWidth = storeSettings?.printerPaperWidth || '80mm';
  const fontSize = Number(storeSettings?.printerFontSize || 12);
  const fontType = storeSettings?.printerFontType || 'monospace';

  // Determine font family
  let fontFamily = "monospace";
  if (fontType === 'sans-serif') {
    fontFamily = "'Inter', system-ui, -apple-system, sans-serif";
  } else if (fontType === 'serif') {
    fontFamily = "'Playfair Display', Georgia, serif";
  }

  const formattedDate = new Date(data.closedAt).toLocaleString('pt-BR');

  const contentHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Fechamento de Caixa</title>
      <style>
        body {
          font-family: ${fontFamily};
          color: #000;
          padding: 8px;
          margin: 0;
          font-size: ${fontSize}px;
          line-height: 1.4;
          background: #fff;
          width: ${paperWidth === '58mm' ? '54mm' : '76mm'};
        }
        .header {
          text-align: center;
          margin-bottom: 12px;
          border-bottom: 2px dashed #000;
          padding-bottom: 8px;
        }
        .title {
          font-weight: bold;
          font-size: ${fontSize + 2}px;
          margin: 0 0 4px 0;
          text-transform: uppercase;
        }
        .section {
          margin-bottom: 10px;
          border-bottom: 1px dashed #000;
          padding-bottom: 8px;
        }
        .flex-between {
          display: flex;
          justify-content: space-between;
        }
        .bold {
          font-weight: bold;
        }
        .footer {
          text-align: center;
          margin-top: 12px;
          font-size: ${fontSize - 2}px;
          border-top: 2px dashed #000;
          padding-top: 8px;
        }
        @media print {
          body {
            width: ${paperWidth};
            margin: 0;
            padding: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">FECHAMENTO DE CAIXA</div>
        <div style="font-weight: bold;">${storeSettings?.name?.toUpperCase() || 'SORVETERIA SUPREME'}</div>
        <div style="font-size: ${fontSize - 1}px; margin-top: 4px;">Data/Hora: ${formattedDate}</div>
      </div>

      <div class="section">
        <div><strong>Operador Responsável:</strong></div>
        <div style="padding-left: 5px;">${data.closedBy}</div>
        <div style="margin-top: 4px;"><strong>ID Fechamento:</strong> #${data.id.slice(-8).toUpperCase()}</div>
      </div>

      <div class="section">
        <div style="font-weight: bold; margin-bottom: 6px; text-transform: uppercase;">Resumo das Vendas:</div>
        <div class="flex-between">
          <span>Quantidade de Pedidos:</span>
          <span>${data.ordersCount}</span>
        </div>
        <div class="flex-between bold" style="margin-top: 4px; font-size: ${fontSize + 1}px;">
          <span>FATURAMENTO TOTAL:</span>
          <span>R$ ${data.totalSales.toFixed(2)}</span>
        </div>
      </div>

      <div class="section">
        <div style="font-weight: bold; margin-bottom: 6px; text-transform: uppercase;">Meios de Pagamento:</div>
        <div class="flex-between">
          <span>PIX:</span>
          <span class="bold">R$ ${data.pixSales.toFixed(2)}</span>
        </div>
        <div class="flex-between">
          <span>Cartão:</span>
          <span class="bold">R$ ${data.cardSales.toFixed(2)}</span>
        </div>
        <div class="flex-between">
          <span>Dinheiro:</span>
          <span class="bold">R$ ${data.cashSales.toFixed(2)}</span>
        </div>
      </div>

      ${data.notes ? `
        <div class="section">
          <div><strong>Observações do Turno:</strong></div>
          <div style="padding: 4px; border: 1px solid #ccc; font-style: italic; background-color: #fafafa; margin-top: 4px; font-size: ${fontSize - 1}px;">
            "${data.notes}"
          </div>
        </div>
      ` : ''}

      <div class="footer">
        <strong>CAIXA FECHADO COM SUCESSO! 🔒</strong>
        <div style="margin-top: 4px;">Desenvolvido por Sorveteria Supreme</div>
      </div>

      <script>
        window.focus();
        window.print();
      </script>
    </body>
    </html>
  `;

  printHtmlContent(contentHtml);
};
