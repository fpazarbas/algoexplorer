import type { NextPageWithLayout } from '@/types';
import { NextSeo } from 'next-seo';
import { useRouter } from 'next/router';
import RootLayout from '@/layouts/_root-layout';
import Image from '@/components/ui/image';
import AnchorLink from '@/components/ui/links/anchor-link';
import routes from '@/config/routes';
import Button from '@/components/ui/button';
import { useIsMounted } from '@/lib/hooks/use-is-mounted';
import { useIsDarkMode } from '@/lib/hooks/use-is-dark-mode';
import ErrorLightImage from '@/assets/images/404-light.svg';
import ErrorDarkImage from '@/assets/images/404-dark.svg';
import { LAYOUT_OPTIONS } from '@/lib/constants';

const WhitePaper: NextPageWithLayout = () => {
    const router = useRouter();
    const {
      query: { layout },
    } = router;
    const isMounted = useIsMounted();
    const { isDarkMode } = useIsDarkMode();
    return (
      <>
        <NextSeo
          title="Introduction to KOC"
          description=""
        />
  
        <div className="flex max-w-full flex-col items-justify justify-center text-leading">
          <div className="relative w-52 max-w-full sm:w-[400px] xl:w-[450px] 3xl:w-[500px]">
            {isMounted && !isDarkMode && (
              <Image src={ErrorLightImage} alt="404 Error" fill />
            )}
            {isMounted && isDarkMode && (
              <Image src={ErrorDarkImage} alt="404 Error" fill />
            )}
          </div>
  
          <h2 className="mt-5 mb-2 text-base font-medium uppercase tracking-wide text-gray-900 dark:text-white sm:mt-10 sm:mb-4 sm:text-xl 3xl:mt-12 3xl:text-2xl">
            Introduction to KOC
          </h2>
          <div className="container">
        <div className="row">
          <div className="offset-lg-2 col-lg-8">
            <div className="condition-wrapper">
              <h2>Introduction to KOC</h2>
              <p>
                Koc Ecosystem consists of product features and mechanisms that support each other while creating new benefits for all parties involved in the ecosystem.
                These main products features and mechanisms are;
              </p>
              <b>Launchpad</b><br />
              <b>Incubator</b><br />
              <b>Staking</b><br />
              <b>Yield Farming</b><br />
              <b>DAO</b><br />
              <b>Funding Pool</b> <br />
              <b>Community Involvement Programs</b><br />
              <b>Community Involvement Rewards</b><br />
              <b>Solution Partners Program</b><br /><br />
              <p>
                Koc Dashboard for a simple user experience to interact with these systems.
                These sets of elements are chosen so they drive win/win situations between the parties involved in our ecosystem, which are mainly;
                Entrepreneurs, innovators, and project teams
                Token holders and stakers
                Community members
                Treasury and resources
                Blockchain ecosystem products &amp; services
              </p>
              <p>
                In this whitepaper, we will go through all the core product features and mechanisms of the Koc ecosystem, one by one, and within each section we will explore how the parties involved in our ecosystem engage and gain mutual advantages through these particular dynamics.
                While the elements mentioned in this whitepaper are the base versions of Koc ecosystem, our DAO will begin from the first days of release, so to go over all the details of user interfaces, workflows and numerical parameters with our community, to release products which are fully tested, and improved by community feedback loops.
              </p>
              <p>
                Thus, community-driven feedback and DAO votings will not only be the mainframe of our incubator system, but also the way Koc ecosystem also goes through its own product development cycles.
                Since adoption metrics of our ecosystem is key to the outcomes it will produce for all parties involved, we aim to develop only through proven feedback cycles which welcome adoption.
              </p>
              <p>
                Lastly, the yearly roadmaps of Koc, will be decided at Q4 through DAO sessions and votings, so each year we can focus on producing extra added benefits and products according to what our community expects, rather than defining our roadmaps in centralized ways.
                Thus, true decentralization, paired with community-driven mechanisms will always be at the core of the Koc ecosystem features and product development cycles.
              </p>
              <h2>WhitePaper</h2>
              <p>
                Koc Ecosystem consists of product features and mechanisms that support each other while creating new benefits for all parties involved in the ecosystem.
                These main products features and mechanisms are;
              </p>
              <b>Launchpad</b><br />
              <b>Incubator</b><br />
              <b>Staking</b><br />
              <b>Yield Farming</b><br />
              <b>DAO</b><br />
              <b>Funding Pool</b> <br />
              <b>Community Involvement Programs</b><br />
              <b>Community Involvement Rewards</b><br />
              <b>Solution Partners Program</b><br /><br />
              <p>
                Koc Dashboard for a simple user experience to interact with these systems.
                These sets of elements are chosen so they drive win/win situations between the parties involved in our ecosystem, which are mainly;
                Entrepreneurs, innovators, and project teams
                Token holders and stakers
                Community members
                Treasury and resources
                Blockchain ecosystem products &amp; services
              </p>
              <p>1. First and foremost, there will be an application in our website that project founders will need to fill which will ask certain questions such as; </p>
              <b>Project Name</b><br />
              <b>Project Logo</b><br />
              <b>Project Category</b><br />
              <b>Project Description</b><br />
              <b>Project Website</b><br />
              <b>Project Team</b><br />
              <b>Whitepaper</b><br />
              <b>Litepaper</b><br />
              <b>Additional documents &amp; Links</b><br />
              <b>Pitch Deck</b><br /><br />
              <p>
                2. After this application is filled online, our team will review and verify whether the application fills the prerequisities.
                *Our team will not decline any project due to project being not good or great due to their opinions. The sole purpose of this application will be to verify that the founder/founders have submitted the requirements, and can be personally verified that he/she/they is the founder of the certain project.
              </p>
              <p> 3. After this step, our team will send the link for project founders to reach the dashboard area, where they can update their custom page on the Koc Project Proposals section. Once they submit the project for public voting, our team will publish the project into the Upcoming Project Proposals part with the next available time schedule for DAO votings to take place, and notify the founders with an email. As Koc we will try to have a schedule on how many ongoing votings can take place at a certain time period, so our community of token holders can have enough time to research each project before casting their votes for the selections.</p>
              <p>4. During the time when the project is waiting its schedule for DAO votings, our community will be able to see and research about the projects, and this timeframe will be a good time for projects to introduce themselves and their offerings to our community through our social channels in Telegram and Discord.</p>
              <p>
                5. Once their scheduled time arrives for DAO votings, our community will start to see these projects in the Ongoing Project Proposals section in our dashboard, and they will be able to start casting their votes.
                As mentioned in our whitepaper, projects will need to have 80% yay (yes) threshold at the end of their DAO voting schedule, and minimum of 20% of token holder values will need to cast their votes.
                (During the vote casting, each $KC token will have a value of 1:1, so rather than a 80% threshold on amount of people who voted, the threshold will be decided according to 80% of the token value casted.)
                These thresholds are designed so only projects that give strong convictions to our community about their future success potential are selected to our seed funding &amp; incubation program.
              </p>
              <p>6. Once vote casting timeline is over, and the project passes the thresholds, the multisig contract will approve the seed funding, and the seed funding will be transfered from the funding pool wallet to the wallet provided by the same email address that initially got verified.</p>
              <p>7. This contract will be a p2p blockchain contract of $75.000 seed funding, and Koc incubation program acceptance, in exchange for %3 of the project s tokens at token generation event, which will be distributed according to the parameters mentioned in the Mechanics of the Fund Pool part more detailed; among;</p>
              Fund pool reallocation<br />
              Staking reward mechanisms<br />
              Community involvement rewards<br />
              Koc operations<br />
              <p> 8. At the final stage, Seedify incubation team will send the introduction documents to the project teams, and they will help with the onboarding for all necessary tools that will be used during the incubation program. Thus, the process for selected projects to become incubated projects will start at this point.</p>
              <h2>Solution Partners Program</h2>
              <p>
                Since one of the core parts of KOC is helping incubated projects to become stronger organizations, we also want to make sure that they gain beneficial partnerships through our program.
                Especially in the blockchain market, partnerships are very important elements for success, since they open new doors for technical opportunities, marketing and awareness benefits, as well as gain new advantages in many different areas regarding to their products, services, and organizations.
                Our Solution Partners Program will be about making strong partnerships for incubated projects, in areas such as;
              </p>
              <b>VC Support </b> <br />
              <b>Development</b><br />
              <b>Marketing &amp; PR</b><br />
              <b>User Interfaces &amp; Design</b><br />
              <b>Smart Contract Security</b><br />
              <b>Staking</b><br />
              <b>Grants</b><br />
              <b>DAO Architecture</b><br />
              <b>Incorporation &amp; Legal</b><br />
              <b>Exchange &amp; Dex Support</b><br />
              <p>
                as well as other areas where partners can add value
                KOC will build an interface where incubated projects can directly contact verified solution partners for their needs, and our partnership managers will be solely focusing on developing this network, through building relationships with the right partners.
                Through this program the process for incubated projects to find the right partners will get easier, also, it will give them a recommendation tool for getting most of their needs met through a simple interface.
                In the selection process to our Solution Partners Program, our partnership team will work on a case-by-case base analysis, research each prospect solution partner carefully, before inviting them to our program. Also when we will start to get applications for the Solution Partners Program, the same case-by-case analysis scenario will continue, so the program can be a trusted way for incubated projects to get their support in the areas they see as necessity.
                *Also, KOC will not enter into any sort of financial or commission based partnership for this program. The program s sole purpose will be to have an extra layer of professional support environment for the incubated projects at KOC.
              </p>
            </div>
          </div>
        </div>
      </div>
          <AnchorLink
            href={{
              pathname: routes.home,
              ...(layout !== LAYOUT_OPTIONS.MODERN &&
                layout !== undefined && {
                  query: {
                    layout,
                  },
                }),
            }}
          >
            <Button shape="rounded">Back to Home</Button>
          </AnchorLink>
        </div>
      </>
    );
  };
  
  WhitePaper.getLayout = function getLayout(page) {
    return (
      <RootLayout contentClassName="flex items-center justify-center">
        {page}
      </RootLayout>
    );
  };
  
  export default WhitePaper;