import React, {Fragment, useContext, useState} from 'react';
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
import {STACKTRACE_PREVIEW_TOOLTIP_DELAY} from 'sentry/components/stacktracePreview';
import StrictClick from 'sentry/components/strictClick';
import Tooltip from 'sentry/components/tooltip';
import {IconChevron} from 'sentry/icons/iconChevron';
import {IconInfo} from 'sentry/icons/iconInfo';
import {IconQuestion} from 'sentry/icons/iconQuestion';
import {IconWarning} from 'sentry/icons/iconWarning';
import {t} from 'sentry/locale';
import DebugMetaStore, {DebugMetaActions} from 'sentry/stores/debugMetaStore';
import space from 'sentry/styles/space';
import {PlatformType, SentryAppComponent} from 'sentry/types';
import {Event} from 'sentry/types/event';
import {defined} from 'sentry/utils';
import withSentryAppComponents from 'sentry/utils/withSentryAppComponents';

import {combineStatus} from '../debugMeta/utils';
import Context from '../frame/context';
import Default from '../frame/lineV2/default';
import Native from '../frame/lineV2/native';

type DefaultProps = Omit<
  React.ComponentProps<typeof Default>,
  'onToggleContext' | 'isExpandable' | 'leadsToApp'
>;

type NativeProps = Omit<
  React.ComponentProps<typeof Native>,
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
  showingAbsoluteAddress,
  showCompleteFunctionName,
  isFrameAfterLastNonApp,
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

  const isFoundByStackScanning = frame.trust === 'scan' || frame.trust === 'cfi-scan';
  const startingAddress = image ? image.image_addr : null;
  const isAbsolute = traceEventDataSectionContext.activeDisplayOptions.includes(
    DisplayOption.ABSOLUTE_ADDRESSES
  );
  const isFullStackTrace = traceEventDataSectionContext.activeDisplayOptions.includes(
    DisplayOption.FULL_STACK_TRACE
  );
  const isInlineFrame =
    prevFrame &&
    getPlatform(frame.platform, platform ?? 'other') ===
      (prevFrame.platform || platform) &&
    frame.instructionAddr === prevFrame.instructionAddr;

  const hasFunctionNameHiddenDetails =
    defined(frame.rawFunction) &&
    defined(frame.function) &&
    frame.function !== frame.rawFunction;

  const tooltipDelay = isHoverPreviewed ? STACKTRACE_PREVIEW_TOOLTIP_DELAY : undefined;

  const [isExpanded, setIsExpanded] = useState(
    expandable ? props.isExpanded ?? false : false
  );

  function toggleContext(evt: React.MouseEvent) {
    evt.preventDefault();
    setIsExpanded(!isExpanded);
  }

  const commonContentProps = {
    leadsToApp,
    frame,
    nextFrame,
    isHoverPreviewed,
    platform,
    isExpanded,
    isUsedForGrouping,
    isExpandable: expandable,
    onToggleContext: toggleContext,
  };

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
    if (isInlineFrame && isFoundByStackScanning) {
      return t('Inline frame, found by stack scanning');
    }

    if (isInlineFrame) {
      return t('Inline frame');
    }

    if (isFoundByStackScanning) {
      return t('Found by stack scanning');
    }

    return undefined;
  }

  function getFunctionName() {
    if (hasFunctionNameHiddenDetails && showCompleteFunctionName && frame.rawFunction) {
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

    if (frame.rawFunction) {
      return {
        value: frame.rawFunction,
        meta: getMeta(frame, 'rawFunction'),
      };
    }

    return undefined;
  }

  function getPackageStatus() {
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

  function makeFilter(addr: string) {
    if (!(!frame.addrMode || frame.addrMode === 'abs') && image) {
      return `${image.debug_id}!${addr}`;
    }

    return addr;
  }

  function scrollToImage(e: React.MouseEvent<HTMLDivElement>) {
    e.stopPropagation(); // to prevent collapsing if collapsible

    if (frame.instructionAddr) {
      DebugMetaActions.updateFilter(makeFilter(frame.instructionAddr));
    }

    scrollToElement('#images-loaded');
  }

  const relativeAddress = convertAbsoluteAddressToRelative();
  const formattedAddress =
    !relativeAddress || isAbsolute ? frame.instructionAddr : relativeAddress;

  const tooltipTitle = getAddressTooltip();
  const functionName = getFunctionName();
  const packageStatus = getPackageStatus();

  const commonItemProps = {
    onClick: expandable ? toggleContext : undefined,
    inApp: frame.inApp,
  };

  return (
    <Fragment>
      <StrictClick onClick={expandable ? toggleContext : undefined}>
        {platform === 'objc' || platform === 'cocoa' || platform === 'native' ? (
          <Fragment>
            <Status {...commonItemProps}>
              {(packageStatus === 'error' || packageStatus === undefined) && (
                <Tooltip
                  title={t('Go to images loaded')}
                  containerDisplayMode="inline-flex"
                >
                  {packageStatus === 'error' ? (
                    <IconQuestion size="sm" color="red300" />
                  ) : (
                    <IconWarning size="sm" color="red300" />
                  )}
                </Tooltip>
              )}
            </Status>
            <Name {...commonItemProps}>
              {!isFullStackTrace && !isExpanded && leadsToApp && (
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
                  {trimPackage(frame.package)}
                </Tooltip>
              ) : (
                `<${t('unknown')}>`
              )}
            </Name>
            <Address {...commonItemProps}>
              <Tooltip
                title={tooltipTitle}
                disabled={!(isFoundByStackScanning || isInlineFrame)}
                delay={tooltipDelay}
              >
                {formattedAddress}
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
                    tooltipProps={
                      isHoverPreviewed
                        ? {delay: STACKTRACE_PREVIEW_TOOLTIP_DELAY}
                        : undefined
                    }
                    onClick={toggleContext}
                  >
                    <IconChevron size="8px" direction={isExpanded ? 'up' : 'down'} />
                  </ToggleButton>
                )}
              </FunctionNameWrapper>
            </FunctionName>
          </Fragment>
        ) : (
          <Default
            {...commonContentProps}
            timesRepeated={timesRepeated}
            isHoverPreviewed={isHoverPreviewed}
            onToggleContext={toggleContext}
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
  onClick?: (evt: React.MouseEvent) => void;
}>`
  display: flex;
  white-space: pre-wrap;
  word-break: break-all;
  ${p => p.inApp && `background: ${p.theme.surface100};`};
  ${p => p.onClick && `cursor: pointer;`};
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
  margin: ${space(1)} 0;
  padding: ${space(1)};
`;

const ToggleButton = styled(Button)`
  width: 16px;
  height: 16px;
`;

const FunctionNameWrapper = styled('div')`
  width: 100%;
  display: grid;
  grid-template-columns: 1fr auto;
`;
