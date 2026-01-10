let comparisonCount = 0;
let autoSaveTimeout = null;

// ========================================
// INDICADOR VISUAL DE SALVAMENTO
// ========================================
function showSaveIndicator(state) {
    const indicator = document.getElementById('saveIndicator');
    const text = document.getElementById('saveIndicatorText');
    
    indicator.classList.remove('saving', 'saved');
    indicator.classList.add('show');
    
    if (state === 'saving') {
        indicator.classList.add('saving');
        text.textContent = 'Salvando...';
        indicator.querySelector('.save-spinner').style.display = 'block';
        indicator.querySelector('.save-checkmark')?.remove();
    } else if (state === 'saved') {
        indicator.classList.add('saved');
        text.textContent = 'Salvo';
        indicator.querySelector('.save-spinner').style.display = 'none';
        
        // Adicionar checkmark se não existir
        if (!indicator.querySelector('.save-checkmark')) {
            const checkmark = document.createElement('span');
            checkmark.className = 'save-checkmark';
            checkmark.textContent = '✓';
            indicator.insertBefore(checkmark, text);
        }
        
        // Esconder depois de 2 segundos
        setTimeout(() => {
            indicator.classList.remove('show');
        }, 2000);
    }
}

// ========================================
// COMPRESSÃO DE IMAGENS
// ========================================
function compressImage(file, maxWidth = 1200, quality = 0.85) {
    return new Promise((resolve, reject) => {
        // Validar tamanho (máx 5MB antes de comprimir)
        if (file.size > 5 * 1024 * 1024) {
            alert('Foto muito grande. Máximo 5MB.');
            reject(new Error('File too large'));
            return;
        }

        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = new Image();
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Calcular dimensões mantendo proporção
                let width = img.width;
                let height = img.height;
                
                if (width > height && width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                } else if (height > maxWidth) {
                    width = Math.round((width * maxWidth) / height);
                    height = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                // Desenhar imagem redimensionada
                ctx.drawImage(img, 0, 0, width, height);
                
                // Converter para base64 com compressão
                const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
                
                console.log(`Foto comprimida: ${(file.size / 1024).toFixed(0)}KB → ${(compressedBase64.length / 1024).toFixed(0)}KB`);
                
                resolve(compressedBase64);
            };
            
            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };
            
            img.src = e.target.result;
        };
        
        reader.onerror = () => {
            reject(new Error('Failed to read file'));
        };
        
        reader.readAsDataURL(file);
    });
}

// ========================================
// PERSISTÊNCIA - SAVE
// ========================================
function saveReport() {
    showSaveIndicator('saving');
    
    const relatorio = {
        meta: {},
        consultor: {},
        avaliacoes: [],
        conclusao: { existe: false, texto: "" },
        roi: { existe: false, investimento: 0, retorno: 0 }
    };

    // Dados do produtor
    relatorio.meta.produtor = document.getElementById('produtor')?.value || "";
    relatorio.meta.cidade = document.getElementById('cidade')?.value || "";
    relatorio.meta.fazenda = document.getElementById('fazenda')?.value || "";
    relatorio.meta.talhao = document.getElementById('talhao')?.value || "";
    relatorio.meta.tamanhoHa = parseFloat(document.getElementById('tamanhoHa')?.value) || 0;
    
    const logoPreview = document.getElementById('logoPreview');
    relatorio.meta.logoBase64 = logoPreview?.classList.contains('show') ? logoPreview.src : "";

    // Avaliações
    const comparisonItems = document.querySelectorAll('.comparison-item');
    comparisonItems.forEach(item => {
        const id = parseInt(item.id.split('-')[1]);
        const grid = item.querySelector('.comparison-grid');
        const content = item.querySelector('.comparison-content');
        const layoutSelect = item.querySelector('.photo-layout-select');
        
        const avaliacao = {
            id: id,
            layout: parseInt(layoutSelect?.value || 2),
            colapsado: content?.classList.contains('collapsed') || false,
            ladoEsquerdo: {},
            ladoDireito: {}
        };

        // Lado esquerdo
        const leftSide = grid?.querySelector('.comparison-side:first-child');
        if (leftSide) {
            const leftLabel = leftSide.querySelector('.side-label');
            const leftSelect = leftSide.querySelector('select');
            const leftTextarea = leftSide.querySelector('textarea');
            const leftPreview = leftSide.querySelector('.photo-preview');
            
            avaliacao.ladoEsquerdo = {
                titulo: leftLabel?.textContent.trim() || "Produto Padrão",
                estadio: leftSelect?.value || "",
                anotacao: leftTextarea?.value || "",
                fotoBase64: (leftPreview?.classList.contains('show')) ? leftPreview.src : ""
            };
        }

        // Lado direito
        const rightSide = grid?.querySelector('.comparison-side:last-child');
        if (rightSide) {
            const rightLabel = rightSide.querySelector('.side-label');
            const rightSelect = rightSide.querySelector('select');
            const rightTextarea = rightSide.querySelector('textarea');
            const rightPreview = rightSide.querySelector('.photo-preview');
            
            avaliacao.ladoDireito = {
                titulo: rightLabel?.textContent.trim() || "Produto Testado",
                estadio: rightSelect?.value || "",
                anotacao: rightTextarea?.value || "",
                fotoBase64: (rightPreview?.classList.contains('show')) ? rightPreview.src : ""
            };
        }

        relatorio.avaliacoes.push(avaliacao);
    });

    // Conclusão
    const conclusaoSection = document.getElementById('conclusao-section');
    if (conclusaoSection) {
        const conclusaoTextarea = document.getElementById('conclusao');
        relatorio.conclusao = {
            existe: true,
            texto: conclusaoTextarea?.value || ""
        };
    }

    // ROI
    const roiSection = document.getElementById('roi-section');
    if (roiSection) {
        const investimentoInput = document.getElementById('investimento');
        const retornoInput = document.getElementById('retorno');
        
        relatorio.roi = {
            existe: true,
            investimento: parseFloat(investimentoInput?.value) || 0,
            retorno: parseFloat(retornoInput?.value) || 0
        };
    }

    // Consultor
    const consultorNome = document.getElementById('consultorNome');
    const consultorPreview = document.getElementById('consultorPreview');
    
    relatorio.consultor = {
        nome: consultorNome?.value || "",
        fotoBase64: (consultorPreview?.classList.contains('show')) ? consultorPreview.src : ""
    };

    // Salvar
    try {
        localStorage.setItem('comparativoSojaAtivo', JSON.stringify(relatorio));
        console.log('✅ Relatório salvo');
        showSaveIndicator('saved');
        return true;
    } catch (error) {
        console.error('❌ Erro ao salvar:', error);
        alert('Erro ao salvar: espaço insuficiente. Reduza o tamanho das fotos.');
        showSaveIndicator('saved');
        return false;
    }
}

// ========================================
// PERSISTÊNCIA - LOAD
// ========================================
function loadReport() {
    let relatorio;
    
    try {
        const saved = localStorage.getItem('comparativoSojaAtivo');
        if (!saved) {
            console.log('ℹ️ Nenhum relatório salvo');
            return false;
        }
        
        relatorio = JSON.parse(saved);
        console.log('✅ Relatório carregado');
    } catch (error) {
        console.error('❌ Erro ao carregar:', error);
        return false;
    }

    // Restaurar dados do produtor
    if (relatorio.meta) {
        document.getElementById('produtor').value = relatorio.meta.produtor || "";
        document.getElementById('cidade').value = relatorio.meta.cidade || "";
        document.getElementById('fazenda').value = relatorio.meta.fazenda || "";
        document.getElementById('talhao').value = relatorio.meta.talhao || "";
        document.getElementById('tamanhoHa').value = relatorio.meta.tamanhoHa || "";
        
        if (relatorio.meta.logoBase64) {
            const logoPreview = document.getElementById('logoPreview');
            const logoBtn = document.getElementById('logoBtn');
            logoPreview.src = relatorio.meta.logoBase64;
            logoPreview.classList.add('show');
            logoBtn.classList.add('hidden');
        }
    }

    // Limpar avaliações existentes
    const comparisonsContainer = document.getElementById('comparisonsContainer');
    comparisonsContainer.querySelectorAll('.comparison-item').forEach(item => item.remove());
    
    const existingConclusao = document.getElementById('conclusao-section');
    if (existingConclusao) existingConclusao.remove();
    
    const existingROI = document.getElementById('roi-section');
    if (existingROI) existingROI.remove();

    // Recriar avaliações
    if (relatorio.avaliacoes?.length > 0) {
        relatorio.avaliacoes.forEach(avaliacao => {
            createComparisonFromData(avaliacao);
        });
        
        const maxId = Math.max(...relatorio.avaliacoes.map(a => a.id));
        comparisonCount = maxId;
    }

    // Restaurar conclusão
    if (relatorio.conclusao?.existe) {
        addConclusao();
        const conclusaoTextarea = document.getElementById('conclusao');
        if (conclusaoTextarea) {
            conclusaoTextarea.value = relatorio.conclusao.texto || "";
        }
    }

    // Restaurar ROI
    if (relatorio.roi?.existe) {
        addROI();
        const investimentoInput = document.getElementById('investimento');
        const retornoInput = document.getElementById('retorno');
        
        if (investimentoInput) investimentoInput.value = relatorio.roi.investimento || "";
        if (retornoInput) retornoInput.value = relatorio.roi.retorno || "";
        
        calcularROI();
    }

    // Restaurar consultor
    if (relatorio.consultor) {
        const consultorNome = document.getElementById('consultorNome');
        if (consultorNome) consultorNome.value = relatorio.consultor.nome || "";

        if (relatorio.consultor.fotoBase64) {
            const consultorPreview = document.getElementById('consultorPreview');
            const consultorBtn = document.getElementById('consultorBtn');
            consultorPreview.src = relatorio.consultor.fotoBase64;
            consultorPreview.classList.add('show');
            consultorBtn.classList.add('hidden');
        }
    }

    console.log('✅ UI restaurada');
    return true;
}

// ========================================
// CRIAR AVALIAÇÃO A PARTIR DE DADOS
// ========================================
function createComparisonFromData(avaliacao) {
    const container = document.getElementById('comparisonsContainer');
    const id = avaliacao.id;
    
    const comparisonHTML = `
        <div class="comparison-item" id="comparison-${id}">
            <div class="comparison-header">
                <div class="section-title">Avaliação ${id}</div>
                <div class="comparison-controls">
                    <select class="photo-layout-select" onchange="togglePhotoLayout(${id}, this.value)">
                        <option value="2" ${avaliacao.layout === 2 ? 'selected' : ''}>2 fotos</option>
                        <option value="1" ${avaliacao.layout === 1 ? 'selected' : ''}>1 foto</option>
                    </select>
                    <button class="control-btn collapse-btn" onclick="toggleCollapseById(${id})" title="Expandir/Recolher">
                        <span class="collapse-icon">${avaliacao.colapsado ? '+' : '−'}</span>
                    </button>
                    <button class="control-btn close-btn" onclick="removeComparison(${id})" title="Remover">×</button>
                </div>
            </div>
            
            <div class="comparison-content ${avaliacao.colapsado ? 'collapsed' : ''}" id="content-${id}">
                <div class="comparison-grid ${avaliacao.layout === 1 ? 'single-photo' : ''}" id="grid-${id}">
                    <div class="comparison-side">
                        <div class="side-label" contenteditable="true">${avaliacao.ladoEsquerdo.titulo}</div>
                        <div class="photo-upload ${avaliacao.ladoEsquerdo.fotoBase64 ? 'has-photo' : ''}" onclick="document.getElementById('leftPhoto-${id}').click()">
                            <input type="file" id="leftPhoto-${id}" accept="image/*" onchange="handlePhotoUpload(event, 'leftPreview-${id}')">
                            <div class="photo-placeholder ${avaliacao.ladoEsquerdo.fotoBase64 ? 'hidden' : ''}">
                                <div class="photo-placeholder-icon">📸</div>
                                <div class="photo-placeholder-text">Adicionar Foto</div>
                            </div>
                            <img id="leftPreview-${id}" class="photo-preview ${avaliacao.ladoEsquerdo.fotoBase64 ? 'show' : ''}" src="${avaliacao.ladoEsquerdo.fotoBase64 || ''}" alt="Foto esquerda">
                        </div>
                        <select>
                            <option value="">Estádio Fenológico</option>
                            <option value="VE" ${avaliacao.ladoEsquerdo.estadio === 'VE' ? 'selected' : ''}>VE - Emergência</option>
                            <option value="VC" ${avaliacao.ladoEsquerdo.estadio === 'VC' ? 'selected' : ''}>VC - Cotilédones</option>
                            <option value="V1" ${avaliacao.ladoEsquerdo.estadio === 'V1' ? 'selected' : ''}>V1 - Primeiro nó</option>
                            <option value="V2" ${avaliacao.ladoEsquerdo.estadio === 'V2' ? 'selected' : ''}>V2 - Segundo nó</option>
                            <option value="V3" ${avaliacao.ladoEsquerdo.estadio === 'V3' ? 'selected' : ''}>V3 - Terceiro nó</option>
                            <option value="V4" ${avaliacao.ladoEsquerdo.estadio === 'V4' ? 'selected' : ''}>V4 - Quarto nó</option>
                            <option value="V5" ${avaliacao.ladoEsquerdo.estadio === 'V5' ? 'selected' : ''}>V5 - Quinto nó</option>
                            <option value="V6" ${avaliacao.ladoEsquerdo.estadio === 'V6' ? 'selected' : ''}>V6 - Sexto nó</option>
                            <option value="R1" ${avaliacao.ladoEsquerdo.estadio === 'R1' ? 'selected' : ''}>R1 - Floração</option>
                            <option value="R2" ${avaliacao.ladoEsquerdo.estadio === 'R2' ? 'selected' : ''}>R2 - Floração Plena</option>
                            <option value="R3" ${avaliacao.ladoEsquerdo.estadio === 'R3' ? 'selected' : ''}>R3 - Início Formação Vagem</option>
                            <option value="R4" ${avaliacao.ladoEsquerdo.estadio === 'R4' ? 'selected' : ''}>R4 - Vagem Formada</option>
                            <option value="R5" ${avaliacao.ladoEsquerdo.estadio === 'R5' ? 'selected' : ''}>R5 - Início Enchimento Grão</option>
                            <option value="R6" ${avaliacao.ladoEsquerdo.estadio === 'R6' ? 'selected' : ''}>R6 - Grão Cheio</option>
                            <option value="R7" ${avaliacao.ladoEsquerdo.estadio === 'R7' ? 'selected' : ''}>R7 - Início Maturação</option>
                            <option value="R8" ${avaliacao.ladoEsquerdo.estadio === 'R8' ? 'selected' : ''}>R8 - Maturação Plena</option>
                        </select>
                        <textarea placeholder="Anotações da avaliação..." rows="3">${avaliacao.ladoEsquerdo.anotacao}</textarea>
                    </div>

                    <div class="comparison-side">
                        <div class="side-label" contenteditable="true">${avaliacao.ladoDireito.titulo}</div>
                        <div class="photo-upload ${avaliacao.ladoDireito.fotoBase64 ? 'has-photo' : ''}" onclick="document.getElementById('rightPhoto-${id}').click()">
                            <input type="file" id="rightPhoto-${id}" accept="image/*" onchange="handlePhotoUpload(event, 'rightPreview-${id}')">
                            <div class="photo-placeholder ${avaliacao.ladoDireito.fotoBase64 ? 'hidden' : ''}">
                                <div class="photo-placeholder-icon">📸</div>
                                <div class="photo-placeholder-text">Adicionar Foto</div>
                            </div>
                            <img id="rightPreview-${id}" class="photo-preview ${avaliacao.ladoDireito.fotoBase64 ? 'show' : ''}" src="${avaliacao.ladoDireito.fotoBase64 || ''}" alt="Foto direita">
                        </div>
                        <select>
                            <option value="">Estádio Fenológico</option>
                            <option value="VE" ${avaliacao.ladoDireito.estadio === 'VE' ? 'selected' : ''}>VE - Emergência</option>
                            <option value="VC" ${avaliacao.ladoDireito.estadio === 'VC' ? 'selected' : ''}>VC - Cotilédones</option>
                            <option value="V1" ${avaliacao.ladoDireito.estadio === 'V1' ? 'selected' : ''}>V1 - Primeiro nó</option>
                            <option value="V2" ${avaliacao.ladoDireito.estadio === 'V2' ? 'selected' : ''}>V2 - Segundo nó</option>
                            <option value="V3" ${avaliacao.ladoDireito.estadio === 'V3' ? 'selected' : ''}>V3 - Terceiro nó</option>
                            <option value="V4" ${avaliacao.ladoDireito.estadio === 'V4' ? 'selected' : ''}>V4 - Quarto nó</option>
                            <option value="V5" ${avaliacao.ladoDireito.estadio === 'V5' ? 'selected' : ''}>V5 - Quinto nó</option>
                            <option value="V6" ${avaliacao.ladoDireito.estadio === 'V6' ? 'selected' : ''}>V6 - Sexto nó</option>
                            <option value="R1" ${avaliacao.ladoDireito.estadio === 'R1' ? 'selected' : ''}>R1 - Floração</option>
                            <option value="R2" ${avaliacao.ladoDireito.estadio === 'R2' ? 'selected' : ''}>R2 - Floração Plena</option>
                            <option value="R3" ${avaliacao.ladoDireito.estadio === 'R3' ? 'selected' : ''}>R3 - Início Formação Vagem</option>
                            <option value="R4" ${avaliacao.ladoDireito.estadio === 'R4' ? 'selected' : ''}>R4 - Vagem Formada</option>
                            <option value="R5" ${avaliacao.ladoDireito.estadio === 'R5' ? 'selected' : ''}>R5 - Início Enchimento Grão</option>
                            <option value="R6" ${avaliacao.ladoDireito.estadio === 'R6' ? 'selected' : ''}>R6 - Grão Cheio</option>
                            <option value="R7" ${avaliacao.ladoDireito.estadio === 'R7' ? 'selected' : ''}>R7 - Início Maturação</option>
                            <option value="R8" ${avaliacao.ladoDireito.estadio === 'R8' ? 'selected' : ''}>R8 - Maturação Plena</option>
                        </select>
                        <textarea placeholder="Anotações da avaliação..." rows="3">${avaliacao.ladoDireito.anotacao}</textarea>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', comparisonHTML);
    attachAutoSaveListeners(id);
}

// ========================================
// AUTO-SAVE COM DEBOUNCE
// ========================================
function triggerAutoSave() {
    if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
    }
    autoSaveTimeout = setTimeout(() => {
        saveReport();
    }, 500);
}

function attachAutoSaveListeners(comparisonId) {
    const item = document.getElementById(`comparison-${comparisonId}`);
    if (!item) return;

    // Inputs, selects e textareas
    const inputs = item.querySelectorAll('input[type="text"], input[type="number"], select, textarea');
    inputs.forEach(input => {
        input.addEventListener('input', triggerAutoSave);
        input.addEventListener('change', triggerAutoSave);
    });

    // Labels editáveis
    const labels = item.querySelectorAll('.side-label');
    labels.forEach(label => {
        label.addEventListener('input', triggerAutoSave);
        label.addEventListener('blur', triggerAutoSave);
    });
}

// ========================================
// UPLOAD DE FOTOS COM COMPRESSÃO
// ========================================
document.getElementById('logoUpload').addEventListener('change', async function(e) {
    const preview = document.getElementById('logoPreview');
    const btn = document.getElementById('logoBtn');
    const file = e.target.files[0];
    
    if (file) {
        try {
            const compressedBase64 = await compressImage(file, 800, 0.9);
            preview.src = compressedBase64;
            preview.classList.add('show');
            btn.classList.add('hidden');
            triggerAutoSave();
        } catch (error) {
            console.error('Erro ao processar logo:', error);
        }
    }
});

document.getElementById('consultorUpload').addEventListener('change', async function(e) {
    const preview = document.getElementById('consultorPreview');
    const btn = document.getElementById('consultorBtn');
    const file = e.target.files[0];
    
    if (file) {
        try {
            const compressedBase64 = await compressImage(file, 800, 0.9);
            preview.src = compressedBase64;
            preview.classList.add('show');
            btn.classList.add('hidden');
            triggerAutoSave();
        } catch (error) {
            console.error('Erro ao processar foto consultor:', error);
        }
    }
});

async function handlePhotoUpload(event, previewId) {
    const preview = document.getElementById(previewId);
    const file = event.target.files[0];
    
    if (file) {
        try {
            const compressedBase64 = await compressImage(file);
            preview.src = compressedBase64;
            preview.classList.add('show');
            
            const uploadArea = preview.closest('.photo-upload');
            const placeholder = uploadArea.querySelector('.photo-placeholder');
            if (placeholder) {
                placeholder.classList.add('hidden');
            }
            uploadArea.classList.add('has-photo');
            triggerAutoSave();
        } catch (error) {
            console.error('Erro ao processar foto:', error);
        }
    }
}

// ========================================
// FUNÇÕES DE AVALIAÇÃO
// ========================================
function addComparison() {
    comparisonCount++;
    const container = document.getElementById('comparisonsContainer');
    
    const comparisonHTML = `
        <div class="comparison-item" id="comparison-${comparisonCount}">
            <div class="comparison-header">
                <div class="section-title">Avaliação ${comparisonCount}</div>
                <div class="comparison-controls">
                    <select class="photo-layout-select" onchange="togglePhotoLayout(${comparisonCount}, this.value)">
                        <option value="2">2 fotos</option>
                        <option value="1">1 foto</option>
                    </select>
                    <button class="control-btn collapse-btn" onclick="toggleCollapseById(${comparisonCount})" title="Expandir/Recolher">
                        <span class="collapse-icon">−</span>
                    </button>
                    <button class="control-btn close-btn" onclick="removeComparison(${comparisonCount})" title="Remover">×</button>
                </div>
            </div>
            
            <div class="comparison-content" id="content-${comparisonCount}">
                <div class="comparison-grid" id="grid-${comparisonCount}">
                    <div class="comparison-side">
                        <div class="side-label" contenteditable="true">Produto Padrão</div>
                        <div class="photo-upload" onclick="document.getElementById('leftPhoto-${comparisonCount}').click()">
                            <input type="file" id="leftPhoto-${comparisonCount}" accept="image/*" onchange="handlePhotoUpload(event, 'leftPreview-${comparisonCount}')">
                            <div class="photo-placeholder">
                                <div class="photo-placeholder-icon">📸</div>
                                <div class="photo-placeholder-text">Adicionar Foto</div>
                            </div>
                            <img id="leftPreview-${comparisonCount}" class="photo-preview" alt="Foto esquerda">
                        </div>
                        <select>
                            <option value="">Estádio Fenológico</option>
                            <option value="VE">VE - Emergência</option>
                            <option value="VC">VC - Cotilédones</option>
                            <option value="V1">V1 - Primeiro nó</option>
                            <option value="V2">V2 - Segundo nó</option>
                            <option value="V3">V3 - Terceiro nó</option>
                            <option value="V4">V4 - Quarto nó</option>
                            <option value="V5">V5 - Quinto nó</option>
                            <option value="V6">V6 - Sexto nó</option>
                            <option value="R1">R1 - Floração</option>
                            <option value="R2">R2 - Floração Plena</option>
                            <option value="R3">R3 - Início Formação Vagem</option>
                            <option value="R4">R4 - Vagem Formada</option>
                            <option value="R5">R5 - Início Enchimento Grão</option>
                            <option value="R6">R6 - Grão Cheio</option>
                            <option value="R7">R7 - Início Maturação</option>
                            <option value="R8">R8 - Maturação Plena</option>
                        </select>
                        <textarea placeholder="Anotações da avaliação..." rows="3"></textarea>
                    </div>

                    <div class="comparison-side">
                        <div class="side-label" contenteditable="true">Produto Testado</div>
                        <div class="photo-upload" onclick="document.getElementById('rightPhoto-${comparisonCount}').click()">
                            <input type="file" id="rightPhoto-${comparisonCount}" accept="image/*" onchange="handlePhotoUpload(event, 'rightPreview-${comparisonCount}')">
                            <div class="photo-placeholder">
                                <div class="photo-placeholder-icon">📸</div>
                                <div class="photo-placeholder-text">Adicionar Foto</div>
                            </div>
                            <img id="rightPreview-${comparisonCount}" class="photo-preview" alt="Foto direita">
                        </div>
                        <select>
                            <option value="">Estádio Fenológico</option>
                            <option value="VE">VE - Emergência</option>
                            <option value="VC">VC - Cotilédones</option>
                            <option value="V1">V1 - Primeiro nó</option>
                            <option value="V2">V2 - Segundo nó</option>
                            <option value="V3">V3 - Terceiro nó</option>
                            <option value="V4">V4 - Quarto nó</option>
                            <option value="V5">V5 - Quinto nó</option>
                            <option value="V6">V6 - Sexto nó</option>
                            <option value="R1">R1 - Floração</option>
                            <option value="R2">R2 - Floração Plena</option>
                            <option value="R3">R3 - Início Formação Vagem</option>
                            <option value="R4">R4 - Vagem Formada</option>
                            <option value="R5">R5 - Início Enchimento Grão</option>
                            <option value="R6">R6 - Grão Cheio</option>
                            <option value="R7">R7 - Início Maturação</option>
                            <option value="R8">R8 - Maturação Plena</option>
                        </select>
                        <textarea placeholder="Anotações da avaliação..." rows="3"></textarea>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', comparisonHTML);
    attachAutoSaveListeners(comparisonCount);
    triggerAutoSave();
}

function removeComparison(id) {
    const element = document.getElementById(`comparison-${id}`);
    if (element) {
        element.remove();
        triggerAutoSave();
    }
}

function toggleCollapseById(id) {
    const content = document.getElementById(`content-${id}`);
    const item = document.getElementById(`comparison-${id}`);
    const icon = item?.querySelector('.collapse-icon');
    
    if (content && icon) {
        if (content.classList.contains('collapsed')) {
            content.classList.remove('collapsed');
            icon.textContent = '−';
        } else {
            content.classList.add('collapsed');
            icon.textContent = '+';
        }
        triggerAutoSave();
    }
}

function togglePhotoLayout(id, layout) {
    const grid = document.getElementById(`grid-${id}`);
    if (layout === '1') {
        grid.classList.add('single-photo');
    } else {
        grid.classList.remove('single-photo');
    }
    triggerAutoSave();
}

// ========================================
// CONCLUSÃO
// ========================================
function addConclusao() {
    if (document.getElementById('conclusao-section')) {
        return;
    }

    const container = document.getElementById('comparisonsContainer');
    const conclusaoHTML = `
        <div class="card conclusion-section" id="conclusao-section">
            <div class="comparison-header">
                <div class="section-title">Conclusão</div>
                <button class="control-btn close-btn" onclick="removeConclusao()" title="Remover">×</button>
            </div>
            <textarea id="conclusao" placeholder="Descreva a conclusão da avaliação..." rows="4"></textarea>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', conclusaoHTML);
    
    const textarea = document.getElementById('conclusao');
    if (textarea) {
        textarea.addEventListener('input', triggerAutoSave);
    }
    
    triggerAutoSave();
}

function removeConclusao() {
    const element = document.getElementById('conclusao-section');
    if (element) {
        element.remove();
        triggerAutoSave();
    }
}

// ========================================
// ROI
// ========================================
function addROI() {
    if (document.getElementById('roi-section')) {
        return;
    }

    const container = document.getElementById('comparisonsContainer');
    const roiHTML = `
        <div class="card conclusion-section" id="roi-section">
            <div class="comparison-header">
                <div class="section-title">ROI</div>
                <button class="control-btn close-btn" onclick="removeROI()" title="Remover">×</button>
            </div>
            <div class="roi-grid">
                <div class="roi-input-group">
                    <label>Investimento (R$/ha)</label>
                    <input type="number" id="investimento" placeholder="0.00" step="0.01" oninput="calcularROI()">
                </div>
                <div class="roi-input-group">
                    <label>Retorno (R$/ha)</label>
                    <input type="number" id="retorno" placeholder="0.00" step="0.01" oninput="calcularROI()">
                </div>
                <div class="roi-result">
                    <label>ROI</label>
                    <div class="roi-value" id="roiValue">0%</div>
                </div>
            </div>
            <div class="roi-return-display">
                <div class="return-value" id="returnValue">
                    <span class="return-icon">💰</span>
                    <span class="return-text">R$ 0,00</span>
                </div>
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', roiHTML);
    
    const investimento = document.getElementById('investimento');
    const retorno = document.getElementById('retorno');
    if (investimento) investimento.addEventListener('input', triggerAutoSave);
    if (retorno) retorno.addEventListener('input', triggerAutoSave);
    
    triggerAutoSave();
}

function removeROI() {
    const element = document.getElementById('roi-section');
    if (element) {
        element.remove();
        triggerAutoSave();
    }
}

function calcularROI() {
    const investimento = parseFloat(document.getElementById('investimento')?.value) || 0;
    const retorno = parseFloat(document.getElementById('retorno')?.value) || 0;
    const roiValueEl = document.getElementById('roiValue');
    const returnValueEl = document.getElementById('returnValue');
    
    let area = parseFloat(document.getElementById('tamanhoHa')?.value) || 0;
    
    const ganhoPorHa = retorno - investimento;
    const ganhoTotal = ganhoPorHa * area;
    
    const returnText = returnValueEl?.querySelector('.return-text');
    if (returnText) {
        if (area > 0) {
            returnText.textContent = 'R$ ' + ganhoTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        } else {
            returnText.textContent = 'R$ ' + ganhoPorHa.toFixed(2).replace('.', ',') + '/ha';
        }
    }
    
    const ganhoParaComparar = area > 0 ? ganhoTotal : ganhoPorHa;
    if (returnValueEl) {
        if (ganhoParaComparar > 0) {
            returnValueEl.className = 'return-value positive';
        } else if (ganhoParaComparar < 0) {
            returnValueEl.className = 'return-value negative';
        } else {
            returnValueEl.className = 'return-value';
        }
    }
    
    if (roiValueEl) {
        if (investimento === 0) {
            roiValueEl.textContent = '0%';
            roiValueEl.className = 'roi-value';
            return;
        }
        
        const roi = ((retorno - investimento) / investimento) * 100;
        roiValueEl.textContent = roi.toFixed(1) + '%';
        
        if (roi > 0) {
            roiValueEl.className = 'roi-value positive';
        } else if (roi < 0) {
            roiValueEl.className = 'roi-value negative';
        } else {
            roiValueEl.className = 'roi-value';
        }
    }
    
    triggerAutoSave();
}

// ========================================
// MENU ADICIONAR
// ========================================
function toggleAddMenu() {
    const menu = document.getElementById('addMenu');
    menu.classList.toggle('show');
}

document.addEventListener('click', function(event) {
    const container = document.querySelector('.add-menu-container');
    const menu = document.getElementById('addMenu');
    if (container && !container.contains(event.target)) {
        menu.classList.remove('show');
    }
});

// ========================================
// EXPORTAÇÃO PARA PDF
// ========================================
async function exportToPDF() {
    const { jsPDF } = window.jspdf;
    
    // Mostrar indicador
    showSaveIndicator('saving');
    const indicator = document.getElementById('saveIndicator');
    const text = document.getElementById('saveIndicatorText');
    text.textContent = 'Gerando PDF...';
    
    // Ocultar elementos que não devem aparecer no PDF
    const elementsToHide = [
        '.save-indicator',
        '.floating-btn',
        '.add-comparison-btn',
        '.add-menu-container',
        '.control-btn',
        '.upload-btn-small',
        '.photo-layout-select',
        '.logo-btn'
    ];
    
    const hiddenElements = [];
    elementsToHide.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
            if (el.style.display !== 'none') {
                el.style.display = 'none';
                hiddenElements.push(el);
            }
        });
    });
    
    // Expandir todos os cards colapsados temporariamente
    const collapsedContents = document.querySelectorAll('.comparison-content.collapsed');
    collapsedContents.forEach(content => {
        content.classList.remove('collapsed');
    });
    
    try {
        // Capturar o conteúdo
        const container = document.querySelector('.container');
        const canvas = await html2canvas(container, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#f5f5f7'
        });
        
        // Criar PDF
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
        const imgX = (pdfWidth - imgWidth * ratio) / 2;
        
        // Calcular quantas páginas são necessárias
        const totalPages = Math.ceil((imgHeight * ratio) / pdfHeight);
        
        for (let i = 0; i < totalPages; i++) {
            if (i > 0) {
                pdf.addPage();
            }
            
            pdf.addImage(
                imgData,
                'JPEG',
                imgX,
                -i * pdfHeight,
                imgWidth * ratio,
                imgHeight * ratio
            );
        }
        
        // Gerar nome do arquivo
        const produtor = document.getElementById('produtor')?.value || 'Sem_Nome';
        const fazenda = document.getElementById('fazenda')?.value || 'Fazenda';
        const fileName = `Comparativo_${produtor.replace(/\s+/g, '_')}_${fazenda.replace(/\s+/g, '_')}.pdf`;
        
        // Salvar PDF
        pdf.save(fileName);
        
        // Feedback sucesso
        text.textContent = 'PDF gerado!';
        setTimeout(() => {
            indicator.classList.remove('show');
        }, 2000);
        
    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        alert('Erro ao gerar PDF. Tente novamente.');
        indicator.classList.remove('show');
    } finally {
        // Restaurar elementos ocultos
        hiddenElements.forEach(el => {
            el.style.display = '';
        });
        
        // Restaurar cards colapsados
        collapsedContents.forEach(content => {
            content.classList.add('collapsed');
        });
    }
}

// ========================================
// INICIALIZAÇÃO
// ========================================
window.addEventListener('load', () => {
    const loaded = loadReport();
    
    if (!loaded || document.querySelectorAll('.comparison-item').length === 0) {
        addComparison();
    }
    
    const mainInputs = ['produtor', 'cidade', 'fazenda', 'talhao', 'tamanhoHa', 'consultorNome'];
    mainInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', triggerAutoSave);
        }
    });
});
