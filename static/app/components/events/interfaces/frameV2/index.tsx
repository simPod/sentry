import {ComponentProps, Fragment, MouseEvent, useContext, useState} from 'react';
import styled from '@emotion/styled';
import scrollToElement from 'scroll-to-element';

import Button from 'sentry/components/button';
import {
  getPlatform,
  hasAssembly,
  hasContextRegisters,
  hasContextSource,
  hasContextVars,
  isDotnet,
  isExpandable,
  trimPackage,
} from 'sentry/components/events/interfaces/frame/utils';
import {formatAddress, parseAddress} from 'sentry/components/events/interfaces/utils';
import AnnotatedText from 'sentry/components/events/meta/annotatedText';
import {getMeta} from 'sentry/components/events/meta/metaProxy';
import {TraceEventDataSectionContext} from 'sentry/components/events/traceEventDataSection';
import {DisplayOption} from 'sentry/components/events/traceEventDataSection/displayOptions';
import Link from 'sentry/components/links/link';
import {STACKTRACE_PREVIEW_TOOLTIP_DELAY} from 'sentry/components/stacktracePreview';
import StrictClick from 'sentry/components/strictClick';
import Tooltip from 'sentry/components/tooltip';
import {IconChevron} from 'sentry/icons/iconChevron';
import {IconInfo} from 'sentry/icons/iconInfo';
import {IconQuestion} from 'sentry/icons/iconQuestion';
import {IconWarning} from 'sentry/icons/iconWarning';
import {t} from 'sentry/locale';
import {DebugMetaActions} from 'sentry/stores/debugMetaStore';
import space from 'sentry/styles/space';
import {PlatformType, SentryAppComponent} from 'sentry/types';
import {Event} from 'sentry/types/event';
import {defined} from 'sentry/utils';
import {isNativePlatform} from 'sentry/utils/platform';
import withSentryAppComponents from 'sentry/utils/withSentryAppComponents';

import {combineStatus} from '../debugMeta/utils';
import Context from '../frame/context';
import Default from '../frame/lineV2/default';
import Native from '../frame/lineV2/native';
import {SymbolicatorStatus} from '../types';

type DefaultProps = Omit<
  ComponentProps<typeof Default>,
  'onToggleContext' | 'isExpandable' | 'leadsToApp'
>;

type NativeProps = Omit<
  ComponentProps<typeof Native>,
  'onToggleContext' | 'isExpandable' | 'leadsToApp'
>;

type Props = {
  event: Event;
  registers: Record<string, string>;
  components: Array<SentryAppComponent>;
  emptySourceNotation?: boolean;
  isOnlyFrame?: boolean;
  nativeV2?: boolean;
} & NativeProps &
  DefaultProps;

function Frame({
  frame,
  nextFrame,
  prevFrame,
  timesRepeated,
  includeSystemFrames,
  isUsedForGrouping,
  maxLengthOfRelativeAddress,
  image,
  registers,
  isOnlyFrame,
  event,
  components,
  emptySourceNotation = false,
  /**
   * Is the stack trace being previewed in a hovercard?
   */
  isHoverPreviewed = false,
  ...props
}: Props) {
  const traceEventDataSectionContext = useContext(TraceEventDataSectionContext);

  if (!traceEventDataSectionContext) {
    return null;
  }

  const absolute = traceEventDataSectionContext.activeDisplayOptions.includes(
    DisplayOption.ABSOLUTE_ADDRESSES
  );

  const fullStackTrace = traceEventDataSectionContext.activeDisplayOptions.includes(
    DisplayOption.FULL_STACK_TRACE
  );

  const fullFunctionName = traceEventDataSectionContext.activeDisplayOptions.includes(
    DisplayOption.VERBOSE_FUNCTION_NAMES
  );

  const tooltipDelay = isHoverPreviewed ? STACKTRACE_PREVIEW_TOOLTIP_DELAY : undefined;
  const foundByStackScanning = frame.trust === 'scan' || frame.trust === 'cfi-scan';
  const startingAddress = image ? image.image_addr : null;
  const packageClickable =
    !!frame.symbolicatorStatus &&
    frame.symbolicatorStatus !== SymbolicatorStatus.UNKNOWN_IMAGE &&
    !isHoverPreviewed;

  /* Prioritize the frame platform but fall back to the platform
   of the stack trace */
  const platform = getPlatform(frame.platform, props.platform ?? 'other') as PlatformType;
  const leadsToApp = !frame.inApp && ((nextFrame && nextFrame.inApp) || !nextFrame);
  const expandable =
    !leadsToApp || includeSystemFrames
      ? isExpandable({
          frame,
          registers,
          platform,
          emptySourceNotation,
          isOnlyFrame,
        })
      : false;

  const inlineFrame =
    prevFrame &&
    platform === (prevFrame.platform || platform) &&
    frame.instructionAddr === prevFrame.instructionAddr;

  const functionNameHiddenDetails =
    defined(frame.rawFunction) &&
    defined(frame.function) &&
    frame.function !== frame.rawFunction;

  const [isExpanded, setIsExpanded] = useState(
    expandable ? props.isExpanded ?? false : false
  );

  function convertAbsoluteAddressToRelative() {
    if (!startingAddress) {
      return '';
    }

    const relativeAddress = formatAddress(
      parseAddress(frame.instructionAddr) - parseAddress(startingAddress),
      maxLengthOfRelativeAddress
    );

    return `+${relativeAddress}`;
  }

  function getAddressTooltip() {
    if (inlineFrame && foundByStackScanning) {
      return t('Inline frame, found by stack scanning');
    }

    if (inlineFrame) {
      return t('Inline frame');
    }

    if (foundByStackScanning) {
      return t('Found by stack scanning');
    }

    return undefined;
  }

  function getFunctionName() {
    if (functionNameHiddenDetails && fullFunctionName && frame.rawFunction) {
      return {
        value: frame.rawFunction,
        meta: getMeta(frame, 'rawFunction'),
      };
    }

    if (frame.function) {
      return {
        value: frame.function,
        meta: getMeta(frame, 'function'),
      };
    }

    return undefined;
  }

  function getStatus() {
    // this is the status of image that belongs to this frame
    if (!image) {
      return undefined;
    }

    const combinedStatus = combineStatus(image.debug_status, image.unwind_status);

    switch (combinedStatus) {
      case 'unused':
        return undefined;
      case 'found':
        return 'success';
      default:
        return 'error';
    }
  }

  function handleGoToImagesLoaded(e: MouseEvent) {
    e.stopPropagation(); // to prevent collapsing if collapsible

    if (frame.instructionAddr) {
      const searchTerm =
        !(!frame.addrMode || frame.addrMode === 'abs') && image
          ? `${image.debug_id}!${frame.instructionAddr}`
          : frame.instructionAddr;

      DebugMetaActions.updateFilter(searchTerm);
    }

    scrollToElement('#images-loaded');
  }

  function handleToggleContext(e: MouseEvent) {
    if (!expandable) {
      return;
    }
    e.preventDefault();
    setIsExpanded(!isExpanded);
  }

  const relativeAddress = convertAbsoluteAddressToRelative();
  const addressTooltip = getAddressTooltip();
  const functionName = getFunctionName();
  const status = getStatus();

  const commonItemProps = {
    onClick: handleToggleContext,
    inApp: frame.inApp,
    expandable,
  };

  return (
    <Fragment>
      <StrictClick onClick={handleToggleContext}>
        {isNativePlatform(platform) ? (
          <Fragment>
            <Status {...commonItemProps}>
              {(status === 'error' || status === undefined) && (
                <PackageStatusButton
                  onClick={handleGoToImagesLoaded}
                  title={t('Go to images loaded')}
                  aria-label={t('Go to images loaded')}
                  icon={
                    status === 'error' ? (
                      <IconQuestion size="sm" color="red300" />
                    ) : (
                      <IconWarning size="sm" color="red300" />
                    )
                  }
                  size="zero"
                  borderless
                />
              )}
            </Status>
            <Name {...commonItemProps}>
              {!fullStackTrace && !isExpanded && leadsToApp && (
                <Fragment>
                  {!nextFrame ? t('Crashed in non-app') : t('Called from')}
                  {':'}&nbsp;
                </Fragment>
              )}
              {defined(frame.package) ? (
                <Tooltip
                  title={frame.package}
                  delay={isHoverPreviewed ? STACKTRACE_PREVIEW_TOOLTIP_DELAY : undefined}
                >
                  <Package>
                    {packageClickable ? (
                      <Link to="" onClick={handleGoToImagesLoaded}>
                        {trimPackage(frame.package)}
                      </Link>
                    ) : (
                      trimPackage(frame.package)
                    )}
                  </Package>
                </Tooltip>
              ) : (
                `<${t('unknown')}>`
              )}
            </Name>
            <Address {...commonItemProps}>
              <Tooltip
                title={addressTooltip}
                disabled={!(foundByStackScanning || inlineFrame)}
                delay={tooltipDelay}
              >
                {!relativeAddress || absolute ? frame.instructionAddr : relativeAddress}
              </Tooltip>
            </Address>
            <Grouping {...commonItemProps}>
              {isUsedForGrouping && (
                <Tooltip
                  title={t(
                    'This frame appears in all other events related to this issue'
                  )}
                  containerDisplayMode="inline-flex"
                >
                  <IconInfo size="xs" color="gray300" />
                </Tooltip>
              )}
            </Grouping>
            <FunctionName {...commonItemProps}>
              <FunctionNameWrapper>
                {functionName ? (
                  <AnnotatedText value={functionName.value} meta={functionName.meta} />
                ) : (
                  `<${t('unknown')}>`
                )}
                {expandable && (
                  <ToggleButton
                    size="zero"
                    css={isDotnet(platform) && {display: 'block !important'}} // remove important once we get rid of css files
                    title={t('Toggle Context')}
                    aria-label={t('Toggle Context')}
                    tooltipProps={
                      isHoverPreviewed
                        ? {delay: STACKTRACE_PREVIEW_TOOLTIP_DELAY}
                        : undefined
                    }
                    onClick={handleToggleContext}
                    icon={
                      <IconChevron size="8px" direction={isExpanded ? 'up' : 'down'} />
                    }
                  />
                )}
              </FunctionNameWrapper>
            </FunctionName>
          </Fragment>
        ) : (
          <Default
            leadsToApp={leadsToApp}
            frame={frame}
            nextFrame={nextFrame}
            isHoverPreviewed={isHoverPreviewed}
            platform={platform}
            isExpanded={isExpanded}
            isUsedForGrouping={isUsedForGrouping}
            isExpandable={expandable}
            onToggleContext={handleToggleContext}
            timesRepeated={timesRepeated}
          />
        )}
      </StrictClick>
      <Registers isExpanded={isExpanded}>
        {isExpanded && (
          <RegistersContent
            frame={frame}
            event={event}
            registers={registers}
            components={components}
            hasContextSource={hasContextSource(frame)}
            hasContextVars={hasContextVars(frame)}
            hasContextRegisters={hasContextRegisters(registers)}
            emptySourceNotation={emptySourceNotation}
            hasAssembly={hasAssembly(frame, platform)}
            expandable={expandable}
            isExpanded={isExpanded}
          />
        )}
      </Registers>
    </Fragment>
  );
}

export default withSentryAppComponents(Frame, {componentType: 'stacktrace-link'});

const Item = styled('div')<{
  inApp: boolean;
  expandable: boolean;
}>`
  display: flex;
  flex-wrap: wrap;
  ${p => p.inApp && `background: ${p.theme.surface100};`};
  ${p => p.expandable && `cursor: pointer;`};
  ${p => p.children && `padding: ${space(1)} ${space(0.5)};`};
`;

const Status = styled(Item)``;

const Name = styled(Item)``;

const Address = styled(Item)`
  font-family: ${p => p.theme.text.familyMono};
`;

const Grouping = styled(Item)``;

const FunctionName = styled(Item)``;

const Registers = styled('div')<{isExpanded: boolean}>`
  grid-column: 1/-1;
  ${p =>
    !p.isExpanded &&
    `
      && {
        border-bottom: none;
      }
    `};
`;

const RegistersContent = styled(Context)`
  margin: ${space(1)} 0 ${space(1)} ${space(0.5)};
  padding: ${space(1)};
`;

const ToggleButton = styled(Button)`
  width: 16px;
  height: 16px;
`;

const Package = styled('div')`
  border-bottom: 1px dashed ${p => p.theme.gray200};
`;

const PackageStatusButton = styled(Button)`
  padding: 0;
  border: none;
  margin-left: ${space(0.5)};
`;

const FunctionNameWrapper = styled('div')`
  width: 100%;
  display: grid;
  grid-template-columns: 1fr auto;
`;
