import {isValidElement, useEffect, useRef, useState} from 'react';
import {browserHistory, RouteComponentProps} from 'react-router';
import styled from '@emotion/styled';

import Button from 'sentry/components/button';
import {IconClose, IconMenu} from 'sentry/icons';
import {t} from 'sentry/locale';
import {fadeIn, slideInLeft} from 'sentry/styles/animations';
import space from 'sentry/styles/space';

import SettingsBreadcrumb from './settingsBreadcrumb';
import SettingsHeader from './settingsHeader';
import SettingsSearch from './settingsSearch';

type Props = {
  renderNavigation?: () => React.ReactNode;
  children: React.ReactNode;
} & RouteComponentProps<{}, {}>;

function SettingsLayout(props: Props) {
  // This is used when the screen is small enough that the navigation should
  // be hidden
  //
  // [!!] On large screens this state is totally unused!
  const [navVisible, setNavVisible] = useState(false);

  // Offset mobile settings navigation by the height of main navigation,
  // settings breadcrumbs and optional warnings.
  const [navOffsetTop, setNavOffsetTop] = useState(0);

  const headerRef = useRef<HTMLDivElement>(null);

  function toggleNav(visible: boolean) {
    const bodyElement = document.getElementsByTagName('body')[0];

    window.scrollTo?.(0, 0);
    bodyElement.classList[visible ? 'add' : 'remove']('scroll-lock');

    setNavVisible(visible);
    setNavOffsetTop(headerRef.current?.getBoundingClientRect().bottom ?? 0);
  }

  // Close menu when navigating away
  useEffect(() => browserHistory.listen(() => toggleNav(false)), []);

  const {renderNavigation, children, params, routes, route} = props;

  // We want child's view's props
  const childProps = children && isValidElement(children) ? children.props : props;
  const childRoutes = childProps.routes || routes || [];
  const childRoute = childProps.route || route || {};
  const shouldRenderNavigation = typeof renderNavigation === 'function';

  return (
    <SettingsColumn>
      <SettingsHeader ref={headerRef}>
        <HeaderContent>
          {shouldRenderNavigation && (
            <NavMenuToggle
              priority="link"
              aria-label={navVisible ? t('Close the menu') : t('Open the menu')}
              icon={navVisible ? <IconClose aria-hidden /> : <IconMenu aria-hidden />}
              onClick={() => toggleNav(!navVisible)}
            />
          )}
          <StyledSettingsBreadcrumb
            params={params}
            routes={childRoutes}
            route={childRoute}
          />
          <SettingsSearch />
        </HeaderContent>
      </SettingsHeader>

      <MaxWidthContainer>
        {shouldRenderNavigation && (
          <SidebarWrapper isVisible={navVisible} offsetTop={navOffsetTop}>
            {renderNavigation!()}
          </SidebarWrapper>
        )}
        <NavMask isVisible={navVisible} onClick={() => toggleNav(false)} />
        <Content>{children}</Content>
      </MaxWidthContainer>
    </SettingsColumn>
  );
}

const SettingsColumn = styled('div')`
  display: flex;
  flex-direction: column;
  flex: 1; /* so this stretches vertically so that footer is fixed at bottom */
  min-width: 0; /* fixes problem when child content stretches beyond layout width */
  footer {
    margin-top: 0;
  }
`;

const HeaderContent = styled('div')`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const NavMenuToggle = styled(Button)`
  display: none;
  margin: -${space(1)} ${space(1)} -${space(1)} -${space(1)};
  padding: ${space(1)};
  color: ${p => p.theme.subText};
  &:hover,
  &:focus,
  &:active {
    color: ${p => p.theme.textColor};
  }
  @media (max-width: ${p => p.theme.breakpoints[0]}) {
    display: block;
  }
`;

const StyledSettingsBreadcrumb = styled(SettingsBreadcrumb)`
  flex: 1;
`;

const MaxWidthContainer = styled('div')`
  display: flex;
  max-width: ${p => p.theme.settings.containerWidth};
  flex: 1;
`;

const SidebarWrapper = styled('div')<{isVisible: boolean; offsetTop: number}>`
  flex-shrink: 0;
  width: ${p => p.theme.settings.sidebarWidth};
  background: ${p => p.theme.background};
  border-right: 1px solid ${p => p.theme.border};

  @media (max-width: ${p => p.theme.breakpoints[0]}) {
    display: ${p => (p.isVisible ? 'block' : 'none')};
    position: fixed;
    top: ${p => p.offsetTop}px;
    bottom: 0;
    overflow-y: auto;
    animation: ${slideInLeft} 100ms ease-in-out;
    z-index: ${p => p.theme.zIndex.settingsSidebarNav};
    box-shadow: ${p => p.theme.dropShadowHeavy};
  }
`;

const NavMask = styled('div')<{isVisible: boolean}>`
  display: none;
  @media (max-width: ${p => p.theme.breakpoints[0]}) {
    display: ${p => (p.isVisible ? 'block' : 'none')};
    background: rgba(0, 0, 0, 0.35);
    height: 100%;
    width: 100%;
    position: absolute;
    z-index: ${p => p.theme.zIndex.settingsSidebarNavMask};
    animation: ${fadeIn} 250ms ease-in-out;
  }
`;

/**
 * Note: `overflow: hidden` will cause some buttons in `SettingsPageHeader` to be cut off because it has negative margin.
 * Will also cut off tooltips.
 */
const Content = styled('div')`
  flex: 1;
  padding: ${space(4)};
  min-width: 0; /* keep children from stretching container */
`;

export default SettingsLayout;
