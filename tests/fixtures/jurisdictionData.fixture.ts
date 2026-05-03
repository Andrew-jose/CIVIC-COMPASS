import { JurisdictionContext } from '../../backend/src/prompts/systemPrompt';

export const travisCountyFixture: JurisdictionContext = {
  state: 'TX',
  county: 'Travis',
  registrationDeadline: '10/07/2024',
  earlyVotingStart: '10/21/2024',
  earlyVotingEnd: '11/01/2024',
  electionDay: '11/05/2024',
  mailBallotDeadline: '10/25/2024',
  idRequirements: [
    'Texas Driver License issued by DPS',
    'Texas Election Identification Certificate issued by DPS',
    'Texas Personal Identification Card issued by DPS',
    'Texas Handgun License issued by DPS',
    'United States Military Identification Card containing the person’s photograph',
    'United States Citizenship Certificate containing the person’s photograph',
    'United States Passport (book or card)'
  ],
  pollingHours: '7:00 AM to 7:00 PM',
  officialWebsite: 'https://votetravis.com',
  registrationUrl: 'https://www.votetexas.gov/register-to-vote/',
  electionOfficePhone: '(512) 238-VOTE',
  electionOfficeName: 'Travis County Clerk - Elections Division'
};
