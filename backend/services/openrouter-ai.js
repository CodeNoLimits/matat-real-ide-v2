// 🤖 OpenRouter AI Service - ChatGPT-4o Integration
// High-quality AI agent for code review and project analysis

class OpenRouterAI {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseURL = 'https://openrouter.ai/api/v1';
        this.model = 'openai/chatgpt-nano-5'; // ChatGPT Nano 5 - Nouveau et moins cher
        this.maxTokens = 4096;
    }

    async chat(messages, options = {}) {
        try {
            const response = await fetch(`${this.baseURL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://matat-real-ide.com',
                    'X-Title': 'MATAT REAL IDE - AI Code Assistant'
                },
                body: JSON.stringify({
                    model: this.model,
                    messages,
                    max_tokens: options.maxTokens || this.maxTokens,
                    temperature: options.temperature || 0.7,
                    top_p: options.topP || 0.9,
                    frequency_penalty: options.frequencyPenalty || 0,
                    presence_penalty: options.presencePenalty || 0,
                    stream: false
                })
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
            }

            const data = await response.json();
            return {
                success: true,
                content: data.choices[0].message.content,
                usage: data.usage,
                model: data.model
            };

        } catch (error) {
            console.error('OpenRouter AI Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async codeReview(code, language, context = {}) {
        const systemPrompt = `Tu es un expert en développement logiciel et architecte technique senior.
Tu analyses du code avec une précision chirurgicale et donnes des conseils pratiques et actionnables.

Contexte du projet: MATAT REAL IDE - Un IDE moderne avec terminal PTY, Socket.io, React TypeScript
Langage: ${language}
Fichier actuel: ${context.currentFile || 'Non spécifié'}

Instructions:
1. Analyse le code pour les bugs, problèmes de performance, et sécurité
2. Propose des améliorations concrètes avec exemples de code
3. Vérifie les bonnes pratiques et conventions
4. Suggère des optimisations
5. Identifie les vulnérabilités potentielles

Réponds en français avec un ton professionnel mais accessible.`;

        const userPrompt = `Voici le code à analyser:

\`\`\`${language}
${code}
\`\`\`

${context.selectedCode ? `\nCode sélectionné spécifiquement:\n\`\`\`${language}\n${context.selectedCode}\n\`\`\`` : ''}

Peux-tu faire une revue de code complète ?`;

        return await this.chat([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ]);
    }

    async explainCode(code, language, context = {}) {
        const systemPrompt = `Tu es un mentor en programmation expert qui explique le code de manière claire et pédagogique.

Contexte: MATAT REAL IDE - ${context.projectInfo || 'Projet de développement'}
Langage: ${language}

Instructions:
1. Explique ce que fait le code étape par étape
2. Identifie les patterns et architectures utilisés
3. Explique les choix techniques
4. Mentionne les concepts importants
5. Suggère des ressources pour approfondir

Réponds en français avec des exemples concrets.`;

        const userPrompt = `Explique-moi ce code:

\`\`\`${language}
${code}
\`\`\`

${context.questions ? `\nQuestions spécifiques: ${context.questions}` : ''}`;

        return await this.chat([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ]);
    }

    async optimizeCode(code, language, context = {}) {
        const systemPrompt = `Tu es un expert en optimisation de code et performance.

Contexte: MATAT REAL IDE
Langage: ${language}
Focus: ${context.optimizationType || 'performance général'}

Instructions:
1. Analyse les goulets d'étranglement
2. Propose des optimisations concrètes avec code
3. Explique l'impact de chaque optimisation
4. Maintiens la lisibilité du code
5. Respecte les bonnes pratiques

Réponds en français avec exemples de code optimisé.`;

        const userPrompt = `Optimise ce code:

\`\`\`${language}
${code}
\`\`\`

${context.performanceIssues ? `\nProblèmes identifiés: ${context.performanceIssues}` : ''}`;

        return await this.chat([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ]);
    }

    async projectAnalysis(projectStructure, context = {}) {
        const systemPrompt = `Tu es un architecte logiciel senior qui analyse des projets complets.

Contexte: MATAT REAL IDE - Analyse de projet
Objectif: Évaluation architecturale et recommandations

Instructions:
1. Analyse la structure du projet
2. Évalue l'architecture générale
3. Identifie les points d'amélioration
4. Suggère des refactoring prioritaires
5. Propose un plan d'action

Réponds en français avec des recommandations pratiques.`;

        const userPrompt = `Analyse ce projet:

Structure:
${projectStructure}

${context.specificConcerns ? `\nPréoccupations spécifiques: ${context.specificConcerns}` : ''}
${context.goals ? `\nObjectifs: ${context.goals}` : ''}`;

        return await this.chat([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ]);
    }

    async debugHelp(error, code, language, context = {}) {
        const systemPrompt = `Tu es un expert en debugging qui résout les problèmes de code efficacement.

Contexte: MATAT REAL IDE
Langage: ${language}
Environnement: ${context.environment || 'Développement'}

Instructions:
1. Analyse l'erreur et le code
2. Identifie la cause racine
3. Propose des solutions étape par étape
4. Suggère des moyens de prévenir ce type d'erreur
5. Donne des conseils de debugging

Réponds en français avec des solutions concrètes.`;

        const userPrompt = `J'ai cette erreur:

Erreur: ${error}

Code problématique:
\`\`\`${language}
${code}
\`\`\`

${context.stackTrace ? `\nStack trace:\n${context.stackTrace}` : ''}
${context.steps ? `\nÉtapes pour reproduire: ${context.steps}` : ''}`;

        return await this.chat([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ]);
    }

    async generateCode(description, language, context = {}) {
        const systemPrompt = `Tu es un développeur expert qui génère du code propre et fonctionnel.

Contexte: MATAT REAL IDE
Langage: ${language}
Framework: ${context.framework || 'Standard'}

Instructions:
1. Génère du code propre et bien structuré
2. Utilise les bonnes pratiques du langage
3. Ajoute des commentaires explicatifs
4. Inclus la gestion d'erreurs
5. Respecte les conventions de nommage

Réponds en français avec le code complet.`;

        const userPrompt = `Génère du code pour:

${description}

${context.requirements ? `\nExigences spécifiques:\n${context.requirements}` : ''}
${context.existingCode ? `\nCode existant à intégrer:\n\`\`\`${language}\n${context.existingCode}\n\`\`\`` : ''}`;

        return await this.chat([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ]);
    }
}

module.exports = OpenRouterAI;