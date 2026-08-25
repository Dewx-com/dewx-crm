import { NavigationDrawerOpenedSection } from '@/navigation-menu-item/display/sections/components/NavigationDrawerOpenedSection';
import { NavigationDrawerWorkspaceSectionSkeletonLoader } from '@/object-metadata/components/NavigationDrawerWorkspaceSectionSkeletonLoader';

import { styled } from '@linaria/react';
import {
  IconInbox,
  IconLayoutDashboard,
  IconMap,
  IconPackage,
  IconPresentation,
  IconReportAnalytics,
  IconSun,
  IconTargetArrow,
  IconUsers,
} from 'twenty-ui/icon';
import { useClientSeat } from '@/client-seat/hooks/useClientSeat';
import { NavigationDrawerAnimatedCollapseWrapper } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerAnimatedCollapseWrapper';
import { NavigationDrawerItem } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerItem';
import { NavigationDrawerSection } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerSection';
import { NavigationDrawerSectionTitle } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerSectionTitle';
import { lazy, Suspense } from 'react';

import { themeCssVariables } from 'twenty-ui/theme-constants';

const FavoritesSectionDispatcher = lazy(() =>
  import('@/navigation-menu-item/display/sections/favorites/components/FavoritesSectionDispatcher').then(
    (module) => ({
      default: module.FavoritesSectionDispatcher,
    }),
  ),
);

const WorkspaceSectionDispatcher = lazy(() =>
  import('@/navigation-menu-item/display/sections/workspace/components/WorkspaceSectionDispatcher').then(
    (module) => ({
      default: module.WorkspaceSectionDispatcher,
    }),
  ),
);

// Prospect Engine: the heading over our own two surfaces. It lives in one string so that a
// differently branded build of this same source changes the menu by changing this line.
const PE_SECTION_TITLE = 'Prospect Engine';

// Their section headings collapse the section when clicked, so the shared style paints a hover
// tint and a pointer cursor. Ours is a plain label with nothing to collapse, and a pointer over
// it would promise an interaction that does not exist. `section-title-container` is the class
// their own component puts on the heading and already uses as a selector, so this reaches for a
// published hook rather than an internal.
const StyledStaticSectionTitle = styled.div`
  .section-title-container:hover {
    background-color: transparent;
    cursor: default;
  }
`;

const StyledScrollableItemsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
`;

export const MainNavigationDrawerScrollableItems = () => {
  // Prospect Engine: a client's seat sees ITS menu — Overview · Plan · Reports · Deliverables ·
  // Prospects · Deals — and nothing of ours (no Clients list, no Tasks, no Snapshots, no Inbox,
  // no Today). Roki, 2026-08-25: "why a client should see Clients? That's for us." Staff keep the
  // full drawer below, unchanged.
  const { isClientSeat } = useClientSeat();
  if (isClientSeat) {
    return (
      <StyledScrollableItemsContainer>
        <NavigationDrawerSection>
          <NavigationDrawerItem label="Overview" to="/client" Icon={IconLayoutDashboard} />
          <NavigationDrawerItem label="Plan" to="/objects/clientPlans" Icon={IconMap} />
          <NavigationDrawerItem label="Reports" to="/objects/clientReports" Icon={IconReportAnalytics} />
          <NavigationDrawerItem label="Deliverables" to="/objects/clientDeliverables" Icon={IconPackage} />
          <NavigationDrawerItem label="Prospects" to="/objects/people" Icon={IconUsers} />
          <NavigationDrawerItem label="Deals" to="/objects/opportunities" Icon={IconTargetArrow} />
        </NavigationDrawerSection>
      </StyledScrollableItemsContainer>
    );
  }
  return (
    <StyledScrollableItemsContainer>
      <NavigationDrawerOpenedSection />
      {/* Prospect Engine: our own surfaces, under one heading of ours and above their object
          list, which carries a heading of its own reading Workspace. */}
      <NavigationDrawerSection>
        <NavigationDrawerAnimatedCollapseWrapper>
          <StyledStaticSectionTitle>
            <NavigationDrawerSectionTitle label={PE_SECTION_TITLE} />
          </StyledStaticSectionTitle>
        </NavigationDrawerAnimatedCollapseWrapper>
        {/* The masked team inbox. Its own item rather than a record table, because a
            conversation is read as a conversation. */}
        <NavigationDrawerItem label="Inbox" to="/inbox" Icon={IconInbox} />
        {/* The daily operating screen: who is waiting, what has stopped moving, which client
            has gone quiet. One item for every reader — a client's role scopes it to their own
            replies and deals without the page knowing anything about it. */}
        <NavigationDrawerItem label="Today" to="/today" Icon={IconSun} />
        {/* Prospect Engine: the client workspace. One item for every reader — a client's role
            scopes it to their own workspace, staff pick one from the selector on the page. */}
        <NavigationDrawerItem
          label="Client workspace"
          to="/client"
          Icon={IconPresentation}
        />
      </NavigationDrawerSection>
      <Suspense fallback={<NavigationDrawerWorkspaceSectionSkeletonLoader />}>
        <FavoritesSectionDispatcher />
        <WorkspaceSectionDispatcher />
      </Suspense>
    </StyledScrollableItemsContainer>
  );
};
