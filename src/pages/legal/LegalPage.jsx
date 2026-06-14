import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, FileText, LockKeyhole, ShieldCheck } from 'lucide-react';
import { COMPANY, COMPANY_LEGAL_LINE } from '../../constants/company';

const updatedAt = '14 de junho de 2026';

const docs = {
  '/termos': {
    icon: FileText,
    title: 'Termos de Uso',
    subtitle: 'Regras para uso da plataforma UpBarber.',
    sections: [
      ['1. Responsável pela plataforma', `${COMPANY_LEGAL_LINE} O contato oficial para dúvidas administrativas, suporte e privacidade é ${COMPANY.email}.`],
      ['2. Uso permitido', 'O UpBarber deve ser usado para gestão legítima de barbearias, clientes, agenda, financeiro, equipe, planos, suporte e comunicações operacionais. É proibido usar a plataforma para fraude, envio abusivo de mensagens, violação de direitos de terceiros ou inserção intencional de dados falsos.'],
      ['3. Responsabilidade do usuário', 'Cada barbearia é responsável por manter seus dados corretos, controlar acessos da equipe, guardar senhas com segurança, conferir cobranças e usar dados de clientes apenas para finalidades permitidas pela lei.'],
      ['4. Planos, cobranças e Pix', `As cobranças da plataforma podem variar conforme o plano contratado. No momento, a forma de pagamento aceita é Pix, com chave CNPJ ${COMPANY.cnpj}, em nome de ${COMPANY.developer}, ${COMPANY.bank}.`],
      ['5. Disponibilidade e melhorias', 'A plataforma pode receber atualizações, correções, melhorias de segurança e ajustes de regras de negócio. Poderão ocorrer interrupções pontuais por manutenção, incidentes técnicos ou indisponibilidade de serviços terceiros.'],
      ['6. Suspensão de acesso', 'O acesso pode ser suspenso em caso de inadimplência, uso indevido, risco à segurança, violação destes termos ou necessidade de proteção da plataforma e dos demais clientes.'],
      ['7. Propriedade intelectual', `A marca, interface, estrutura, códigos, fluxos e identidade do UpBarber pertencem à ${COMPANY.developer}, salvo componentes de terceiros usados conforme suas respectivas licenças.`],
      ['8. Revisão jurídica', 'Este texto organiza as regras operacionais da plataforma, mas deve ser revisado por assessoria jurídica para adequação final ao contrato comercial de cada cliente.'],
    ],
  },
  '/privacidade': {
    icon: LockKeyhole,
    title: 'Política de Privacidade e LGPD',
    subtitle: 'Como tratamos dados pessoais e protegemos informações.',
    sections: [
      ['1. Controlador e canal de contato', `${COMPANY_LEGAL_LINE} Para assuntos de privacidade e proteção de dados, entre em contato por ${COMPANY.email}.`],
      ['2. Dados tratados', 'Podemos tratar dados de cadastro, login, barbearia, equipe, clientes da barbearia, agenda, serviços, produtos, financeiro, suporte, logs técnicos, endereço IP, registros de acesso e informações necessárias para cobrança e segurança.'],
      ['3. Finalidades', 'Os dados são usados para autenticação, operação do sistema, gestão da barbearia, emissão de cobranças, suporte, prevenção a fraudes, auditoria, melhoria da experiência, cumprimento de obrigações legais e comunicação com usuários autorizados.'],
      ['4. Base LGPD', 'O tratamento pode se apoiar em execução de contrato, cumprimento de obrigação legal ou regulatória, legítimo interesse, exercício regular de direitos e consentimento quando aplicável.'],
      ['5. Segurança', 'Aplicamos medidas técnicas e administrativas para reduzir riscos, como autenticação, controle de acesso, segregação por barbearia, logs, senhas criptografadas e uso de conexões protegidas. Nenhum sistema é totalmente imune a incidentes, por isso o usuário deve proteger suas credenciais.'],
      ['6. Compartilhamento', 'Dados podem ser compartilhados com provedores necessários à operação, como hospedagem, e-mail, mensageria, meios de pagamento, suporte técnico e autoridades públicas quando houver obrigação legal.'],
      ['7. Direitos do titular', 'Titulares podem solicitar confirmação de tratamento, acesso, correção, anonimização, bloqueio, eliminação, portabilidade, informação sobre compartilhamento e revisão de consentimento, conforme a LGPD e a viabilidade técnica/legal da solicitação.'],
      ['8. Retenção', 'Dados são mantidos enquanto necessários para prestação do serviço, cumprimento legal, segurança, auditoria, cobrança, defesa de direitos e continuidade operacional.'],
      ['9. Responsabilidade da barbearia', 'A barbearia deve informar seus próprios clientes sobre o uso do sistema quando inserir dados pessoais deles e deve possuir base legal adequada para cadastrar, consultar e comunicar esses clientes.'],
    ],
  },
  '/cookies': {
    icon: ShieldCheck,
    title: 'Política de Cookies',
    subtitle: 'Uso de cookies e armazenamento local no UpBarber.',
    sections: [
      ['1. O que são cookies', 'Cookies e tecnologias semelhantes são pequenos registros usados para manter sessão, lembrar preferências, proteger o acesso e melhorar o funcionamento da aplicação.'],
      ['2. Cookies necessários', 'Usamos cookies ou armazenamento local necessários para login, autenticação, segurança, sessão do usuário, preferências de interface e aceite deste aviso. Sem esses recursos, partes essenciais do sistema podem não funcionar.'],
      ['3. Cookies não necessários', 'No momento, o UpBarber prioriza recursos essenciais. Caso sejam adicionadas ferramentas de métricas, marketing ou terceiros, esta política deve ser atualizada e o consentimento poderá ser solicitado quando aplicável.'],
      ['4. Como gerenciar', 'Você pode apagar cookies e dados locais nas configurações do navegador. Ao apagar esses dados, poderá ser necessário fazer login novamente e aceitar o aviso de cookies outra vez.'],
      ['5. Referência LGPD', 'Esta política segue a orientação de transparência, finalidade e necessidade recomendada pela Autoridade Nacional de Proteção de Dados para uso de cookies.'],
    ],
  },
};

export default function LegalPage() {
  const location = useLocation();
  const doc = docs[location.pathname] ?? docs['/termos'];
  const Icon = doc.icon;

  return (
    <div className="min-h-screen bg-dark text-white">
      <main className="max-w-4xl mx-auto px-5 py-10">
        <Link to="/login" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white">
          <ArrowLeft size={16} /> Voltar
        </Link>

        <section className="mt-8 bg-dark-100 border border-dark-400 rounded-xl p-6 md:p-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gold/15 text-gold flex items-center justify-center flex-shrink-0">
              <Icon size={24} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-gold font-bold">NEXUS TECNOLOGIA LTDA · CNPJ {COMPANY.cnpj}</p>
              <h1 className="text-3xl font-bold mt-2">{doc.title}</h1>
              <p className="text-gray-400 mt-2">{doc.subtitle}</p>
              <p className="text-xs text-gray-500 mt-3">Última atualização: {updatedAt}</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-2 mt-8">
            <Link to="/termos" className="btn-secondary justify-center">Termos</Link>
            <Link to="/privacidade" className="btn-secondary justify-center">Privacidade</Link>
            <Link to="/cookies" className="btn-secondary justify-center">Cookies</Link>
          </div>

          <div className="mt-8 space-y-6">
            {doc.sections.map(([title, text]) => (
              <section key={title}>
                <h2 className="text-lg font-semibold text-white">{title}</h2>
                <p className="text-sm text-gray-400 leading-6 mt-2">{text}</p>
              </section>
            ))}
          </div>

          <div className="mt-8 p-4 rounded-lg bg-gold/10 border border-gold/20">
            <p className="text-sm text-gold font-semibold">Aviso importante</p>
            <p className="text-xs text-gray-300 leading-5 mt-1">
              Este documento é uma base operacional de transparência e segurança. Para reduzir risco jurídico, a versão final deve ser revisada por profissional jurídico considerando contratos, operação real, fornecedores e fluxos de dados da empresa.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
